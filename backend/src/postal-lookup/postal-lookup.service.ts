import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PostalLocation {
  postalCode: string;
  city: string;
  district: string;
  state: string;
  area: string;
  postOffice: string;
  country: string;
  countryCode: string;
  latitude?: string;
  longitude?: string;
  accuracy?: string;
  branchType?: string;
  deliveryStatus?: string;
  division?: string;
  region?: string;
  circle?: string;
  block?: string;
}

export interface LocationLookupResult {
  found: boolean;
  postalCode: string;
  city: string;
  district: string;
  state: string;
  area: string;
  postOffice: string;
  country: string;
  countryCode: string;
  locations: PostalLocation[];
  source: 'api' | 'local' | 'manual';
  message?: string;
}

interface PostalIndexEntry {
  country_code: string;
  country_name?: string;
  records?: number;
  split?: boolean;
}

interface RawPostalRecord {
  country_code?: string;
  country_name?: string;
  postal_code?: string;
  place?: string;
  admin1?: string;
  admin1_code?: string;
  admin2?: string;
  admin2_code?: string;
  admin3?: string;
  admin3_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  accuracy?: string | number;
  slug?: string;
}

interface AfghanistanPostalRecord {
  country_code?: string;
  country_name?: string;
  postal_code?: string;
  province?: string;
  district?: string;
  city?: string;
  place?: string;
  latitude?: string | number;
  longitude?: string | number;
  accuracy?: string | number;
  [key: string]: unknown;
}

interface IndiaPostOffice {
  Name?: string;
  Description?: string | null;
  BranchType?: string;
  DeliveryStatus?: string;
  Circle?: string;
  District?: string;
  Division?: string;
  Region?: string;
  Block?: string;
  State?: string;
  Country?: string;
  Pincode?: string;
}

interface IndiaPostApiResponse {
  Message?: string;
  Status?: string;
  PostOffice?: IndiaPostOffice[] | null;
}

interface IndiaPinOverride {
  city?: string;
  district?: string;
  state?: string;
  area?: string;
}

@Injectable()
export class PostalLookupService {
  private readonly logger = new Logger(PostalLookupService.name);

  private readonly dataRoot = path.resolve(process.cwd(), 'data');

  private readonly postalRoot = path.join(
    this.dataRoot,
    'postal-codes',
  );

  private readonly afghanistanRoot = path.join(
    this.dataRoot,
    'AF',
  );

  private readonly indiaApiBaseUrl =
    'https://api.postalpincode.in/pincode';

  private readonly indiaCache = new Map<
    string,
    { expiresAt: number; result: LocationLookupResult }
  >();

  private readonly indiaCacheTtlMs = 10 * 60 * 1000;

  private readonly countryRecordsCache = new Map<
    string,
    RawPostalRecord[]
  >();

  private afghanistanRecordsCache:
    | AfghanistanPostalRecord[]
    | null = null;

  private readonly countryNames: Record<string, string> = {
    IN: 'India',
    CN: 'China',
    KR: 'South Korea',
    AF: 'Afghanistan',
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    CA: 'Canada',
    FR: 'France',
    AU: 'Australia',
    AE: 'United Arab Emirates',
    JP: 'Japan',
    ID: 'Indonesia',
    MX: 'Mexico',
    NL: 'Netherlands',
    PE: 'Peru',
    PL: 'Poland',
    PT: 'Portugal',
    SG: 'Singapore',
  };

  /*
   * India administrative corrections that are intentionally
   * limited to known verified cases. We do not create a large
   * manual database in the application.
   */
  private readonly indiaPinOverrides: Record<
    string,
    IndiaPinOverride
  > = {
      '401209': {
        city: 'Vasai',
        district: 'Palghar',
        state: 'Maharashtra',
        area: 'Nallasopara East',
      },
    };

  async lookup(
    postalCodeInput: string,
    countryCodeInput = 'IN',
  ): Promise<LocationLookupResult> {
    const postalCode = this.normalizePostalCode(
      postalCodeInput,
    );

    const countryCode = (
      countryCodeInput || 'IN'
    )
      .trim()
      .toUpperCase();

    const countryName =
      this.countryNames[countryCode] || countryCode;

    if (!postalCode) {
      return this.emptyResult(
        '',
        countryCode,
        countryName,
        'Postal code cannot be empty',
      );
    }

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return this.emptyResult(
        postalCode,
        countryCode,
        countryName,
        'Invalid country code',
      );
    }

    try {
      /*
       * INDIA IS API-FIRST.
       * The browser never calls this API directly. NestJS calls it,
       * normalizes the response, and sends the complete list to the UI.
       */
      if (countryCode === 'IN') {
        return await this.lookupIndia(postalCode);
      }

      if (countryCode === 'AF') {
        return await this.lookupAfghanistan(postalCode);
      }

      const locations =
        await this.lookupCountryFromLocalData(
          countryCode,
          postalCode,
        );

      if (locations.length === 0) {
        return this.emptyResult(
          postalCode,
          countryCode,
          countryName,
          'Postal code not found in local postal data.',
        );
      }

      const first = locations[0];

      return {
        found: true,
        postalCode,
        city: first.city,
        district: first.district,
        state: first.state,
        area: first.area,
        postOffice: first.postOffice,
        country: first.country,
        countryCode,
        locations,
        source: 'local',
        message: this.buildSuccessMessage(
          locations,
          countryCode,
        ),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown postal lookup error';

      this.logger.error(
        `Postal lookup failed for ${countryCode}/${postalCode}: ${message}`,
      );

      return this.emptyResult(
        postalCode,
        countryCode,
        countryName,
        'Postal data could not be loaded. Please enter the location manually.',
      );
    }
  }

  /* =========================================================
     INDIA API
     ========================================================= */

  private async lookupIndia(
    postalCode: string,
  ): Promise<LocationLookupResult> {
    const cached = this.indiaCache.get(postalCode);

    if (
      cached &&
      cached.expiresAt > Date.now()
    ) {
      return cached.result;
    }

    if (!/^\d{6}$/.test(postalCode)) {
      return this.emptyResult(
        postalCode,
        'IN',
        'India',
        'Indian PIN code must contain exactly 6 digits.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      10_000,
    );

    try {
      const response = await fetch(
        `${this.indiaApiBaseUrl}/${encodeURIComponent(postalCode)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `India PIN API returned HTTP ${response.status}`,
        );
      }

      const payload =
        (await response.json()) as unknown;

      if (
        !Array.isArray(payload) ||
        payload.length === 0
      ) {
        return this.emptyResult(
          postalCode,
          'IN',
          'India',
          'No India Post data was returned for this PIN code.',
        );
      }

      const apiResult =
        payload[0] as IndiaPostApiResponse;

      if (
        apiResult.Status?.toLowerCase() !== 'success' ||
        !Array.isArray(apiResult.PostOffice) ||
        apiResult.PostOffice.length === 0
      ) {
        return this.emptyResult(
          postalCode,
          'IN',
          'India',
          apiResult.Message ||
          'Pincode not found in India Post data.',
        );
      }

      const locations =
        this.mapIndiaPostOffices(
          postalCode,
          apiResult.PostOffice,
        );

      if (locations.length === 0) {
        return this.emptyResult(
          postalCode,
          'IN',
          'India',
          'No usable Post Office records were returned for this PIN code.',
        );
      }

      const first = locations[0];

      const result: LocationLookupResult = {
        found: true,
        postalCode,
        city: first.city,
        district: first.district,
        state: first.state,
        area: first.area,
        postOffice: first.postOffice,
        country: 'India',
        countryCode: 'IN',
        locations,
        source: 'api',
        message:
          locations.length > 1
            ? `${locations.length} Post Office locations found. Select the correct Post Office.`
            : this.buildSuccessMessage(
              locations,
              'IN',
            ),
      };

      this.indiaCache.set(postalCode, {
        expiresAt:
          Date.now() + this.indiaCacheTtlMs,
        result,
      });

      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapIndiaPostOffices(
    postalCode: string,
    offices: IndiaPostOffice[],
  ): PostalLocation[] {
    const override =
      this.indiaPinOverrides[postalCode];

    const locations = offices
      .map((office): PostalLocation | null => {
        const postOffice =
          String(office.Name || '').trim();

        if (!postOffice) {
          return null;
        }

        /*
         * India Post's API has Block but does not expose a universal
         * locality/area field. Block is the best administrative city
         * fallback for this UI; a known verified override wins.
         */
        const city =
          override?.city ||
          this.firstNonEmpty(
            office.Block,
            office.District,
          );

        const district =
          override?.district ||
          String(office.District || '').trim();

        const state =
          override?.state ||
          String(office.State || '').trim();

        /*
         * Do NOT put the Post Office name into Area / Locality.
         * India Post's response does not guarantee that Name is a
         * locality. Use Description only when it is actually supplied;
         * otherwise leave Area blank so SKM ERP never stores a guessed
         * locality as fact.
         */
        const area =
          override?.area ||
          String(office.Description || '').trim();

        const location: PostalLocation = {
          postalCode,
          city,
          district,
          state,
          area,
          postOffice,
          country:
            String(office.Country || '').trim() ||
            'India',
          countryCode: 'IN',
          branchType:
            String(office.BranchType || '').trim() ||
            undefined,
          deliveryStatus:
            String(
              office.DeliveryStatus || '',
            ).trim() || undefined,
          division:
            String(office.Division || '').trim() ||
            undefined,
          region:
            String(office.Region || '').trim() ||
            undefined,
          circle:
            String(office.Circle || '').trim() ||
            undefined,
          block:
            String(office.Block || '').trim() ||
            undefined,
        };

        return location;
      })
      .filter(
        (location): location is PostalLocation =>
          location !== null,
      );

    return this.removeDuplicateLocations(locations);
  }

  private firstNonEmpty(
    ...values: Array<
      string | undefined | null
    >
  ): string {
    for (const value of values) {
      const normalized =
        String(value || '').trim();

      if (normalized) {
        return normalized;
      }
    }

    return '';
  }

  /* =========================================================
     LOCAL WORLD POSTAL DATA
     ========================================================= */

  private async lookupCountryFromLocalData(
    countryCode: string,
    postalCode: string,
  ): Promise<PostalLocation[]> {
    const records =
      await this.loadCountryRecords(countryCode);

    if (records.length === 0) {
      return [];
    }

    const normalizedSearch =
      this.normalizePostalCode(postalCode);

    const matches = records.filter((record) => {
      const recordPostal =
        this.normalizePostalCode(
          String(record.postal_code || ''),
        );

      return recordPostal === normalizedSearch;
    });

    return this.mapRecordsToLocations(
      matches,
      countryCode,
    );
  }

  private async loadCountryRecords(
    countryCode: string,
  ): Promise<RawPostalRecord[]> {
    const cached =
      this.countryRecordsCache.get(countryCode);

    if (cached) {
      return cached;
    }

    if (!fs.existsSync(this.postalRoot)) {
      throw new Error(
        `Postal data directory not found: ${this.postalRoot}`,
      );
    }

    const indexPath = path.join(
      this.postalRoot,
      'index.json',
    );

    let indexEntries: PostalIndexEntry[] = [];

    if (fs.existsSync(indexPath)) {
      try {
        const raw = await fs.promises.readFile(
          indexPath,
          'utf8',
        );
        const indexData: unknown = JSON.parse(raw);

        if (Array.isArray(indexData)) {
          indexEntries = indexData as PostalIndexEntry[];
        } else if (
          typeof indexData === 'object' &&
          indexData !== null &&
          'countries' in indexData &&
          Array.isArray(
            (indexData as { countries?: unknown })
              .countries,
          )
        ) {
          indexEntries = (
            indexData as {
              countries: PostalIndexEntry[];
            }
          ).countries;
        } else if (
          typeof indexData === 'object' &&
          indexData !== null
        ) {
          indexEntries = Object.entries(
            indexData,
          ).map(([code, value]) => {
            const item =
              value as Record<string, unknown>;

            return {
              country_code: code,
              country_name:
                typeof item.country_name === 'string'
                  ? item.country_name
                  : typeof item.name === 'string'
                    ? item.name
                    : undefined,
              records:
                typeof item.records === 'number'
                  ? item.records
                  : typeof item.count === 'number'
                    ? item.count
                    : undefined,
              split:
                typeof item.split === 'boolean'
                  ? item.split
                  : undefined,
            };
          });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown index error';

        this.logger.warn(
          `Could not read postal index.json: ${message}`,
        );
      }
    }

    const indexEntry = indexEntries.find(
      (entry) =>
        entry.country_code?.toUpperCase() ===
        countryCode,
    );

    const countryFile = path.join(
      this.postalRoot,
      `${countryCode}.csv`,
    );

    const countryDirectory = path.join(
      this.postalRoot,
      countryCode,
    );

    let csvFiles: string[] = [];

    if (
      indexEntry?.split === false ||
      fs.existsSync(countryFile)
    ) {
      if (fs.existsSync(countryFile)) {
        csvFiles.push(countryFile);
      }
    }

    if (
      indexEntry?.split === true ||
      fs.existsSync(countryDirectory)
    ) {
      if (fs.existsSync(countryDirectory)) {
        const directoryFiles =
          await this.collectCsvFiles(
            countryDirectory,
          );

        csvFiles.push(...directoryFiles);
      }
    }

    csvFiles = Array.from(
      new Set(csvFiles),
    );

    if (csvFiles.length === 0) {
      this.logger.warn(
        `No local postal CSV files found for country ${countryCode}`,
      );

      this.countryRecordsCache.set(
        countryCode,
        [],
      );

      return [];
    }

    const allRecords: RawPostalRecord[] = [];

    for (const csvFile of csvFiles) {
      try {
        const records =
          await this.readCsvFile(csvFile);

        allRecords.push(...records);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown CSV error';

        this.logger.warn(
          `Could not read ${csvFile}: ${message}`,
        );
      }
    }

    this.countryRecordsCache.set(
      countryCode,
      allRecords,
    );

    this.logger.log(
      `Loaded ${allRecords.length} postal records for ${countryCode} from ${csvFiles.length} CSV file(s).`,
    );

    return allRecords;
  }

  private async collectCsvFiles(
    directory: string,
  ): Promise<string[]> {
    const result: string[] = [];

    const entries =
      await fs.promises.readdir(
        directory,
        { withFileTypes: true },
      );

    for (const entry of entries) {
      const fullPath = path.join(
        directory,
        entry.name,
      );

      if (entry.isDirectory()) {
        result.push(
          ...(await this.collectCsvFiles(
            fullPath,
          )),
        );
        continue;
      }

      if (
        entry.isFile() &&
        entry.name
          .toLowerCase()
          .endsWith('.csv')
      ) {
        result.push(fullPath);
      }
    }

    return result;
  }

  private parseCsv(
    content: string,
  ): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let insideQuotes = false;

    for (
      let i = 0;
      i < content.length;
      i++
    ) {
      const char = content[i];

      if (char === '"') {
        if (
          insideQuotes &&
          content[i + 1] === '"'
        ) {
          field += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (
        char === ',' &&
        !insideQuotes
      ) {
        row.push(field);
        field = '';
        continue;
      }

      if (
        (char === '\n' || char === '\r') &&
        !insideQuotes
      ) {
        if (
          char === '\r' &&
          content[i + 1] === '\n'
        ) {
          i++;
        }

        row.push(field);
        field = '';

        if (
          row.some(
            (value) =>
              value.trim().length > 0,
          )
        ) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      field += char;
    }

    if (
      field.length > 0 ||
      row.length > 0
    ) {
      row.push(field);

      if (
        row.some(
          (value) =>
            value.trim().length > 0,
        )
      ) {
        rows.push(row);
      }
    }

    return rows;
  }

  private async readCsvFile(
    filePath: string,
  ): Promise<RawPostalRecord[]> {
    const content =
      await fs.promises.readFile(
        filePath,
        'utf8',
      );

    const rows = this.parseCsv(content);

    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map(
      (header) =>
        header
          .replace(/^\uFEFF/, '')
          .trim(),
    );

    const records: RawPostalRecord[] = [];

    for (
      let rowIndex = 1;
      rowIndex < rows.length;
      rowIndex++
    ) {
      const row = rows[rowIndex];
      const record: RawPostalRecord = {};

      headers.forEach(
        (header, columnIndex) => {
          record[header as keyof RawPostalRecord] =
            row[columnIndex]?.trim() || '';
        },
      );

      records.push(record);
    }

    return records;
  }

  private mapRecordsToLocations(
    records: RawPostalRecord[],
    countryCode: string,
  ): PostalLocation[] {
    const country =
      this.countryNames[countryCode] ||
      records[0]?.country_name ||
      countryCode;

    const locations = records.map(
      (record): PostalLocation => ({
        postalCode: String(
          record.postal_code || '',
        ).trim(),
        city: String(
          record.place || '',
        ).trim(),
        district: String(
          record.admin2 || '',
        ).trim(),
        state: String(
          record.admin1 || '',
        ).trim(),
        area: String(
          record.admin3 || '',
        ).trim(),
        postOffice: '',
        country:
          String(
            record.country_name || '',
          ).trim() || country,
        countryCode,
        latitude:
          record.latitude !== undefined
            ? String(record.latitude)
            : undefined,
        longitude:
          record.longitude !== undefined
            ? String(record.longitude)
            : undefined,
        accuracy:
          record.accuracy !== undefined
            ? String(record.accuracy)
            : undefined,
      }),
    );

    return this.removeDuplicateLocations(
      locations,
    );
  }

  /* =========================================================
     AFGHANISTAN
     ========================================================= */

  private async lookupAfghanistan(
    postalCode: string,
  ): Promise<LocationLookupResult> {
    const records =
      await this.loadAfghanistanRecords();

    const matches = records.filter(
      (record) =>
        this.normalizePostalCode(
          String(record.postal_code || ''),
        ) === postalCode,
    );

    if (matches.length === 0) {
      return this.emptyResult(
        postalCode,
        'AF',
        'Afghanistan',
        'Postal code not found in Afghanistan local postal data.',
      );
    }

    const locations = this.removeDuplicateLocations(
      matches.map(
        (record): PostalLocation => ({
          postalCode,
          city: this.getFirstValue(
            record,
            ['city', 'place'],
          ),
          district: this.getFirstValue(
            record,
            ['district', 'admin2'],
          ),
          state: this.getFirstValue(
            record,
            ['province', 'admin1'],
          ),
          area: '',
          postOffice: '',
          country: 'Afghanistan',
          countryCode: 'AF',
          latitude:
            record.latitude !== undefined
              ? String(record.latitude)
              : undefined,
          longitude:
            record.longitude !== undefined
              ? String(record.longitude)
              : undefined,
          accuracy:
            record.accuracy !== undefined
              ? String(record.accuracy)
              : undefined,
        }),
      ),
    );

    const first = locations[0];

    return {
      found: true,
      postalCode,
      city: first.city,
      district: first.district,
      state: first.state,
      area: first.area,
      postOffice: first.postOffice,
      country: 'Afghanistan',
      countryCode: 'AF',
      locations,
      source: 'local',
      message: this.buildSuccessMessage(
        locations,
        'AF',
      ),
    };
  }

  private async loadAfghanistanRecords(): Promise<
    AfghanistanPostalRecord[]
  > {
    if (this.afghanistanRecordsCache) {
      return this.afghanistanRecordsCache;
    }

    const csvPath = path.join(
      this.afghanistanRoot,
      'all-flat.csv',
    );

    if (!fs.existsSync(csvPath)) {
      throw new Error(
        `Afghanistan postal data not found: ${csvPath}`,
      );
    }

    const content =
      await fs.promises.readFile(
        csvPath,
        'utf8',
      );

    const rows = this.parseCsv(content);

    if (rows.length < 2) {
      this.afghanistanRecordsCache = [];
      return [];
    }

    const headers = rows[0].map(
      (header) =>
        header
          .replace(/^\uFEFF/, '')
          .trim(),
    );

    const records: AfghanistanPostalRecord[] = [];

    for (
      let rowIndex = 1;
      rowIndex < rows.length;
      rowIndex++
    ) {
      const row = rows[rowIndex];
      const record: AfghanistanPostalRecord = {};

      headers.forEach(
        (header, columnIndex) => {
          record[header] =
            row[columnIndex]?.trim() || '';
        },
      );

      records.push(record);
    }

    this.afghanistanRecordsCache = records;

    this.logger.log(
      `Loaded ${records.length} Afghanistan postal records.`,
    );

    return records;
  }

  /* =========================================================
     COMMON HELPERS
     ========================================================= */

  private normalizePostalCode(
    value: string,
  ): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private getFirstValue(
    record: AfghanistanPostalRecord,
    keys: string[],
  ): string {
    for (const key of keys) {
      const value = record[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return String(value).trim();
      }
    }

    return '';
  }

  private removeDuplicateLocations(
    locations: PostalLocation[],
  ): PostalLocation[] {
    const seen = new Set<string>();

    return locations.filter((location) => {
      const key = [
        location.postalCode,
        location.city,
        location.district,
        location.state,
        location.area,
        location.postOffice,
      ]
        .map((value) =>
          value.trim().toLowerCase(),
        )
        .join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private buildSuccessMessage(
    locations: PostalLocation[],
    countryCode: string,
  ): string {
    if (locations.length === 0) {
      return 'No postal locations found.';
    }

    if (locations.length === 1) {
      const location = locations[0];
      const parts = [
        location.city,
        location.district,
        location.state,
      ].filter(Boolean);

      if (countryCode === 'IN') {
        return parts.length > 0
          ? `Auto-detected from India Post data: ${parts.join(', ')}`
          : 'Location detected from India Post data.';
      }

      return parts.length > 0
        ? `Auto-detected: ${parts.join(', ')}`
        : 'Location detected from local postal data.';
    }

    return `${locations.length} locations found for this postal code.`;
  }

  private emptyResult(
    postalCode: string,
    countryCode: string,
    country: string,
    message: string,
  ): LocationLookupResult {
    return {
      found: false,
      postalCode,
      city: '',
      district: '',
      state: '',
      area: '',
      postOffice: '',
      country,
      countryCode,
      locations: [],
      source: 'manual',
      message,
    };
  }
}
