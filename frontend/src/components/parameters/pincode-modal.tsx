'use client';

import * as React from 'react';

import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

import { api } from '../../lib/api';

import {
  PincodeRecord,
  Division,
  LocationLookupResult,
  PostalLocation,
} from '../../types';

import {
  Sparkles,
  Loader2,
  Check,
  Globe,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';

import { toast } from 'sonner';

import { useErpContextStore } from '../../stores/context-store';

interface PincodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PincodeRecord | null;
  allDivisions: Division[];
  readOnly?: boolean;
}

/* =========================================================
   COUNTRY CONFIGURATION
   ========================================================= */

interface CountryConfig {
  code: string;
  name: string;

  level1Label: string;
  level2Label: string;
  localityLabel: string;

  placeholder: string;
}

const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    level1Label: 'State / Province',
    level2Label: 'District',
    localityLabel: 'City / Town',
    placeholder: 'e.g. 401209',
  },
  {
    code: 'CN',
    name: 'China',
    level1Label: 'Province / Municipality',
    level2Label: 'District / County',
    localityLabel: 'City / Town',
    placeholder: 'e.g. 100000',
  },
  {
    code: 'KR',
    name: 'South Korea',
    level1Label: 'Province / Metropolitan City',
    level2Label: 'District / County',
    localityLabel: 'City / Town',
    placeholder: 'e.g. 04524',
  },
  {
    code: 'AF',
    name: 'Afghanistan',
    level1Label: 'Province',
    level2Label: 'District',
    localityLabel: 'City / Town',
    placeholder: 'e.g. 1001',
  },
  {
    code: 'US',
    name: 'United States',
    level1Label: 'State',
    level2Label: 'County',
    localityLabel: 'City',
    placeholder: 'e.g. 10001',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    level1Label: 'Country / Region',
    level2Label: 'County',
    localityLabel: 'Town / City',
    placeholder: 'e.g. SW1A 1AA',
  },
  {
    code: 'DE',
    name: 'Germany',
    level1Label: 'State',
    level2Label: 'District',
    localityLabel: 'City / Town',
    placeholder: 'e.g. 10115',
  },
  {
    code: 'CA',
    name: 'Canada',
    level1Label: 'Province / Territory',
    level2Label: 'District / Region',
    localityLabel: 'City / Town',
    placeholder: 'e.g. M5V 3A8',
  },
  {
    code: 'FR',
    name: 'France',
    level1Label: 'Region',
    level2Label: 'Department',
    localityLabel: 'City / Commune',
    placeholder: 'e.g. 75001',
  },
  {
    code: 'AU',
    name: 'Australia',
    level1Label: 'State / Territory',
    level2Label: 'Region',
    localityLabel: 'City / Suburb',
    placeholder: 'e.g. 2000',
  },
];

/* =========================================================
   INDIA PIN ADMINISTRATIVE OVERRIDES
   ========================================================= */

interface IndiaPinOverride {
  city?: string;
  district?: string;
  state?: string;
  area?: string;
}

const INDIA_PIN_ADMIN_OVERRIDES: Record<
  string,
  IndiaPinOverride
> = {
  '401209': {
    city: 'Vasai',
    district: 'Palghar',
    area: 'Nallasopara East',
  },
};

/* =========================================================
   INDIA AREA NORMALIZATION
   ========================================================= */

function normalizeIndiaArea(value: string): string {
  const input = value.trim();

  if (!input) {
    return '';
  }

  let result = input;

  result = result
    .replace(/\bNallosapare\b/gi, 'Nallasopara')
    .replace(/\bNalasopare\b/gi, 'Nallasopara')
    .replace(/\bNalasopara\b/gi, 'Nallasopara');

  result = result.replace(/\s+E$/i, ' East');
  result = result.replace(/\s+W$/i, ' West');

  return result.trim();
}

/* =========================================================
   POST OFFICE DROPDOWN
   ========================================================= */

interface PostOfficeDropdownProps {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

function PostOfficeDropdown({
  value,
  options,
  disabled = false,
  onChange,
}: PostOfficeDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const containerRef =
    React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
    };
  }, []);

  const displayValue =
    value || 'Select Post Office';

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          setOpen((previous) => !previous)
        }
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border border-input bg-card text-left focus:ring-2 focus:ring-primary focus:outline-hidden ${disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-secondary/30'
          }`}
      >
        <span
          className={
            value
              ? 'text-foreground truncate'
              : 'text-muted-foreground'
          }
        >
          {displayValue}
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''
            }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 w-full z-[100] rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-[120px] overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No Post Office available
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-secondary transition-colors ${value === option
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground'
                    }`}
                >
                  <span className="truncate">
                    {option}
                  </span>

                  {value === option && (
                    <Check className="w-3.5 h-3.5 shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN MODAL
   ========================================================= */

export function PincodeModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  allDivisions,
  readOnly = false,
}: PincodeModalProps) {
  const { activeDivision, isHoActive } =
    useErpContextStore();

  const isEditing = !!initialData;
  const effectiveReadOnly = readOnly || (!isHoActive && !!initialData);

  const [pincode, setPincode] =
    React.useState('');

  const [city, setCity] =
    React.useState('');

  const [district, setDistrict] =
    React.useState('');

  const [state, setState] =
    React.useState('');

  const [country, setCountry] =
    React.useState('India');

  const [countryCode, setCountryCode] =
    React.useState('IN');

  const [area, setArea] =
    React.useState('');

  const [postOffice, setPostOffice] =
    React.useState('');

  const [postOfficeOptions, setPostOfficeOptions] =
    React.useState<string[]>([]);

  /*
   * Keep every location returned by the backend.
   * This is important for India because one PIN can have
   * multiple Post Offices.
   */
  const [postalLocations, setPostalLocations] =
    React.useState<PostalLocation[]>([]);

  const [selectedDivisions, setSelectedDivisions] =
    React.useState<string[]>([]);

  const [divisionSearch, setDivisionSearch] =
    React.useState('');

  const [isLookingUp, setIsLookingUp] =
    React.useState(false);

  const [isSaving, setIsSaving] =
    React.useState(false);

  const [lookupMessage, setLookupMessage] =
    React.useState('');

  /*
   * Prevent an older lookup response from
   * overwriting a newer lookup.
   */
  const lookupRequestId =
    React.useRef(0);

  /* =========================================================
     CURRENT COUNTRY CONFIG
     ========================================================= */

  const currentCountry =
    COUNTRIES.find(
      (item) =>
        item.code === countryCode,
    ) || COUNTRIES[0];

  /* =========================================================
     INITIAL DATA / RESET
     ========================================================= */

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const record =
      initialData as PincodeRecord | null | undefined;

    if (record) {
      setPincode(record.pincode || '');

      setCity(record.city || '');

      setDistrict(
        record.district || '',
      );

      setState(record.state || '');

      setCountry(
        record.country || 'India',
      );

      const matchedCountry =
        COUNTRIES.find(
          (item) =>
            item.name.toLowerCase() ===
            (
              record.country || ''
            ).toLowerCase(),
        );

      setCountryCode(
        record.countryCode ||
        matchedCountry?.code ||
        'IN',
      );

      setArea(
        record.area || '',
      );

      setPostOffice(
        record.postOffice || '',
      );

      setPostOfficeOptions(
        record.postOffice
          ? [record.postOffice]
          : [],
      );
      setPostalLocations(
        record.postOffice
          ? [
            {
              postalCode: record.pincode || '',
              city: record.city || '',
              district: record.district || '',
              state: record.state || '',
              area: record.area || '',
              postOffice: record.postOffice || '',
              country: record.country || 'India',
              countryCode:
                record.countryCode || 'IN',
            },
          ]
          : [],
      );

      setSelectedDivisions(
        Array.isArray(
          record.assignedDivisions,
        )
          ? record.assignedDivisions.map(
            (division) =>
              division.id,
          )
          : [],
      );

      setLookupMessage('');

      return;
    }

    setPincode('');
    setCity('');
    setDistrict('');
    setState('');
    setCountry('India');
    setCountryCode('IN');
    setArea('');
    setPostOffice('');
    setPostOfficeOptions([]);
    setPostalLocations([]);
    setLookupMessage('');

    /*
     * Default assignment:
     * HO + current active operating division.
     */
    const hoDiv =
      allDivisions.find(
        (division) =>
          division.is_ho,
      );

    const defaultIds: string[] = [];

    if (hoDiv) {
      defaultIds.push(
        hoDiv.id,
      );
    }

    if (
      activeDivision &&
      activeDivision.id !==
      hoDiv?.id
    ) {
      defaultIds.push(
        activeDivision.id,
      );
    }

    setSelectedDivisions(
      defaultIds,
    );
    setDivisionSearch('');
  }, [
    isOpen,
    initialData,
    allDivisions,
    activeDivision,
  ]);

  /* =========================================================
     APPLY LOOKUP LOCATION
     ========================================================= */

  const applyLocation = (
    location: PostalLocation,
    result: LocationLookupResult,
  ) => {
    if (!location) {
      return;
    }

    const override =
      countryCode === 'IN'
        ? INDIA_PIN_ADMIN_OVERRIDES[
        pincode.trim()
        ]
        : undefined;

    const detectedCity =
      override?.city ||
      location.city ||
      '';

    const detectedDistrict =
      override?.district ||
      location.district ||
      '';

    const detectedState =
      location.state || '';

    const detectedArea =
      override?.area ||
      (
        countryCode === 'IN'
          ? normalizeIndiaArea(
            location.area ||
            '',
          )
          : location.area ||
          ''
      );

    setCity(
      detectedCity,
    );

    setDistrict(
      detectedDistrict,
    );

    setState(
      detectedState,
    );

    setCountry(
      location.country ||
      result.country ||
      currentCountry.name,
    );

    setCountryCode(
      location.countryCode ||
      result.countryCode ||
      countryCode,
    );

    setArea(
      detectedArea,
    );

    /*
     * Select the exact Post Office represented by this location.
     * The complete options list is populated by lookupPincode().
     */
    if (location.postOffice?.trim()) {
      setPostOffice(location.postOffice.trim());
    } else {
      setPostOffice('');
    }

    const parts = [
      detectedCity,
      detectedDistrict,
      detectedState,
    ].filter(Boolean);

    if (
      result.locations.length > 1 &&
      countryCode === 'IN'
    ) {
      setLookupMessage(
        `${result.locations.length} Post Office locations found. Select the correct Post Office.`,
      );
    } else if (
      result.locations.length > 1
    ) {
      setLookupMessage(
        `${result.locations.length} postal locations found. Select the correct location.`,
      );
    } else if (
      parts.length > 0
    ) {
      setLookupMessage(
        `Auto-detected: ${parts.join(', ')}`,
      );
    } else {
      setLookupMessage(
        'Location detected from local postal data.',
      );
    }
  };

  /* =========================================================
     POSTAL LOOKUP
     ========================================================= */

  const lookupPincode = async (
    postalCode: string,
    requestId: number,
  ) => {
    try {
      const result =
        await api.get<LocationLookupResult>(
          `/postal-lookup/${encodeURIComponent(
            postalCode,
          )}`,
          {
            country: countryCode,
          },
        );

      /*
       * Ignore an old request if the user has
       * already entered another postal code.
       */
      if (
        requestId !==
        lookupRequestId.current
      ) {
        return false;
      }

      if (
        !result ||
        !result.found
      ) {
        return false;
      }

      /*
       * Prefer the locations array because a postal
       * code can legitimately have multiple places.
       */
      if (
        Array.isArray(
          result.locations,
        ) &&
        result.locations.length > 0
      ) {
        const locations = result.locations;

        setPostalLocations(locations);

        /*
         * Show every Post Office returned by the India API.
         * Remove blank names and duplicate names while preserving
         * the API order.
         */
        const officeNames = Array.from(
          new Set(
            locations
              .map((location) =>
                location.postOffice?.trim(),
              )
              .filter(
                (name): name is string =>
                  Boolean(name),
              ),
          ),
        );

        setPostOfficeOptions(officeNames);

        applyLocation(
          locations[0],
          result,
        );

        return true;
      }

      /*
       * Backward-compatible fallback if the backend
       * returns only the primary fields.
       */
      const fallbackLocation: PostalLocation =
      {
        postalCode:
          result.postalCode ||
          postalCode,
        city:
          result.city || '',
        district:
          result.district || '',
        state:
          result.state || '',
        area:
          result.area || '',
        postOffice:
          result.postOffice || '',
        country:
          result.country ||
          currentCountry.name,
        countryCode:
          result.countryCode ||
          countryCode,
      };

      setPostalLocations([fallbackLocation]);

      setPostOfficeOptions(
        fallbackLocation.postOffice
          ? [fallbackLocation.postOffice]
          : [],
      );

      applyLocation(
        fallbackLocation,
        result,
      );

      return true;
    } catch (error: unknown) {
      /*
       * Lookup failure should NOT prevent the user
       * from entering the address manually.
       */
      if (
        requestId ===
        lookupRequestId.current
      ) {
        const message =
          error instanceof Error
            ? error.message
            : '';

        /*
         * Keep the user-facing message simple.
         */
        setLookupMessage(
          message
            ? 'Postal code could not be found automatically. Please verify it or enter the location manually.'
            : '',
        );
      }

      return false;
    }
  };

  /* =========================================================
     PINCODE INPUT / AUTOMATIC LOOKUP
     ========================================================= */

  const handlePincodeChange = async (
    value: string,
  ) => {
    setPincode(value);

    /*
     * Editing an authoritative record:
     * do not automatically replace stored values.
     */
    if (isEditing) {
      return;
    }

    const trimmed =
      value.trim();

    /*
     * Every time the postal code changes,
     * invalidate any previous lookup.
     */
    lookupRequestId.current += 1;

    const requestId =
      lookupRequestId.current;

    /*
     * Clear location fields until the new lookup
     * completes.
     */
    if (
      countryCode === 'IN'
    ) {
      if (
        trimmed.length !== 6
      ) {
        setCity('');
        setDistrict('');
        setState('');
        setArea('');
        setPostOffice('');
        setPostOfficeOptions([]);
        setPostalLocations([]);
        setLookupMessage('');
      }
    } else {
      /*
       * International countries have different
       * postal formats.
       */
      if (
        trimmed.length < 3
      ) {
        setCity('');
        setDistrict('');
        setState('');
        setArea('');
        setPostOffice('');
        setPostOfficeOptions([]);
        setPostalLocations([]);
        setLookupMessage('');
      }
    }

    /*
     * India:
     * lookup at exactly 6 digits.
     *
     * Other countries:
     * start lookup at 3 characters because formats
     * vary considerably.
     */
    const shouldLookup =
      countryCode === 'IN'
        ? /^\d{6}$/.test(
          trimmed,
        )
        : trimmed.length >= 3;

    if (!shouldLookup) {
      return;
    }

    setIsLookingUp(true);
    setLookupMessage('');

    try {
      const success =
        await lookupPincode(
          trimmed,
          requestId,
        );

      if (
        requestId ===
        lookupRequestId.current &&
        !success
      ) {
        /*
         * Do not rely on the current React state here.
         * State updates are asynchronous and can still contain
         * the previous PIN's city at this point.
         */
        setLookupMessage(
          (previous) =>
            previous ||
            'Postal code not found. Please verify the postal code or enter the location manually.',
        );
      }
    } finally {
      if (
        requestId ===
        lookupRequestId.current
      ) {
        setIsLookingUp(false);
      }
    }
  };

  /* =========================================================
     POST OFFICE CHANGE
     ========================================================= */

  const handlePostOfficeChange = (
    selectedOffice: string,
  ) => {
    const office =
      postalLocations.find(
        (location) =>
          location.postOffice.trim() ===
          selectedOffice.trim(),
      );

    if (!office) {
      setPostOffice(selectedOffice);
      return;
    }

    /*
     * Selecting a Post Office applies that exact API record.
     * The PIN, State, District and City remain tied to the
     * selected postal location. Area is used only when the
     * backend actually has reliable data for it.
     */
    const override =
      countryCode === 'IN'
        ? INDIA_PIN_ADMIN_OVERRIDES[
        pincode.trim()
        ]
        : undefined;

    setCity(
      override?.city ||
      office.city ||
      '',
    );
    setDistrict(
      override?.district ||
      office.district ||
      '',
    );
    setState(
      override?.state ||
      office.state ||
      '',
    );
    setArea(
      override?.area ||
      (countryCode === 'IN'
        ? normalizeIndiaArea(
          office.area || '',
        )
        : office.area || ''),
    );
    setCountry(
      office.country ||
      country,
    );
    setPostOffice(
      office.postOffice,
    );
  };

  /* =========================================================
     DIVISION TOGGLE
     ========================================================= */

  const toggleDivision = (
    divId: string,
  ) => {
    if (effectiveReadOnly) {
      return;
    }
    const division =
      allDivisions.find(
        (item) =>
          item.id === divId,
      );

    /*
     * HO must always remain selected.
     */
    if (
      division?.is_ho
    ) {
      return;
    }

    setSelectedDivisions(
      (previous) =>
        previous.includes(
          divId,
        )
          ? previous.filter(
            (id) =>
              id !== divId,
          )
          : [
            ...previous,
            divId,
          ],
    );
  };

  /* =========================================================
     COUNTRY CHANGE
     ========================================================= */

  const handleCountryChange = (
    newCode: string,
  ) => {
    const found =
      COUNTRIES.find(
        (item) =>
          item.code === newCode,
      );

    if (!found) {
      return;
    }

    /*
     * Invalidate any lookup that may still be running.
     */
    lookupRequestId.current += 1;

    setCountryCode(
      found.code,
    );

    setCountry(
      found.name,
    );

    /*
     * A postal code belongs to a country,
     * so clear the old country's location.
     */
    setPincode('');
    setCity('');
    setDistrict('');
    setState('');
    setArea('');
    setPostOffice('');
    setPostOfficeOptions([]);
    setPostalLocations([]);
    setLookupMessage('');
    setIsLookingUp(false);
  };

  /* =========================================================
     SUBMIT
     ========================================================= */

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (
      !pincode.trim()
    ) {
      toast.error(
        'Postal / Pincode is required.',
      );
      return;
    }

    if (
      !city.trim()
    ) {
      toast.error(
        `${currentCountry.localityLabel} is required.`,
      );
      return;
    }

    if (
      !state.trim()
    ) {
      toast.error(
        `${currentCountry.level1Label} is required.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      /*
       * Send the complete geographic information
       * to the backend.
       */
      const payload = {
        pincode:
          pincode.trim(),

        city:
          city.trim(),

        district:
          district.trim(),

        area:
          area.trim(),

        postOffice:
          postOffice.trim(),

        state:
          state.trim(),

        country:
          country.trim(),

        countryCode:
          countryCode,

        assignedDivisionIds:
          selectedDivisions,
      };

      if (
        isEditing &&
        initialData
      ) {
        await api.patch(
          `/parameters/pincodes/${initialData.id}`,
          {
            city:
              payload.city,

            district:
              payload.district,

            area:
              payload.area,

            postOffice:
              payload.postOffice,

            state:
              payload.state,

            country:
              payload.country,

            countryCode:
              payload.countryCode,

            assignedDivisionIds:
              payload.assignedDivisionIds,
          },
        );

        toast.success(
          'Pincode parameter updated successfully.',
        );
      } else {
        await api.post(
          '/parameters/pincodes',
          payload,
        );

        toast.success(
          'Pincode parameter created and assigned centrally by HO.',
        );
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save pincode';

      toast.error(
        message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        effectiveReadOnly
          ? 'View Authoritative Pincode'
          : isEditing
          ? 'Edit Authoritative Pincode'
          : 'Create Centrally Controlled Pincode'
      }
      description="Centrally managed by SKM STEELS LIMITED (HO) for consistent organizational use."
      maxWidth="lg"
    >
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4"
      >
        {/* =====================================================
            COUNTRY
            ===================================================== */}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Country
          </label>

          <div className="relative">
            <Globe className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />

            <select
              value={
                countryCode
              }
              onChange={(
                event,
              ) =>
                handleCountryChange(
                  event.target
                    .value,
                )
              }
              disabled={
                isEditing || effectiveReadOnly
              }
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
            >
              {COUNTRIES.map(
                (item) => (
                  <option
                    key={
                      item.code
                    }
                    value={
                      item.code
                    }
                  >
                    {item.name} (
                    {item.code})
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* =====================================================
            POSTAL / PINCODE
            ===================================================== */}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-foreground">
              Postal / Pincode *
            </label>

            {isLookingUp && (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />

                <span>
                  Determining location...
                </span>
              </span>
            )}
          </div>

          <Input
            value={
              pincode
            }
            onChange={(
              event,
            ) =>
              handlePincodeChange(
                event.target
                  .value,
              )
            }
            placeholder={
              currentCountry.placeholder
            }
            disabled={
              isEditing || effectiveReadOnly
            }
            required
          />

          {lookupMessage && (
            <p className="mt-1 text-[11px] text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />

              <span>
                {lookupMessage}
              </span>
            </p>
          )}
        </div>

        {/* =====================================================
            CITY + STATE
            ===================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CITY / TOWN */}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {
                currentCountry.localityLabel
              }{' '}
              *
            </label>

            <Input
              value={
                city
              }
              onChange={(
                event,
              ) =>
                setCity(
                  event.target
                    .value,
                )
              }
              placeholder="Auto-detected from postal code"
              disabled={effectiveReadOnly || isSaving}
              required
            />
          </div>

          {/* STATE / PROVINCE */}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {
                currentCountry.level1Label
              }{' '}
              *
            </label>

            <Input
              value={
                state
              }
              onChange={(
                event,
              ) =>
                setState(
                  event.target
                    .value,
                )
              }
              placeholder="Auto-detected from postal code"
              disabled={effectiveReadOnly || isSaving}
              required
            />
          </div>
        </div>

        {/* =====================================================
            DISTRICT + AREA
            ===================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* DISTRICT */}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {
                currentCountry.level2Label
              }
            </label>

            <Input
              value={
                district
              }
              onChange={(
                event,
              ) =>
                setDistrict(
                  event.target
                    .value,
                )
              }
              placeholder="Auto-detected when available"
              disabled={effectiveReadOnly || isSaving}
            />
          </div>

          {/* AREA / LOCALITY */}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Area / Locality
            </label>

            <Input
              value={
                area
              }
              onChange={(
                event,
              ) =>
                setArea(
                  event.target
                    .value,
                )
              }
              placeholder="Auto-detected when reliable data is available"
              disabled={effectiveReadOnly || isSaving}
            />
          </div>
        </div>

        {/* =====================================================
            INDIA POST OFFICE
            ===================================================== */}

        {countryCode ===
          'IN' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Post Office
              </label>

              <PostOfficeDropdown
                value={
                  postOffice
                }
                options={
                  postOfficeOptions
                }
                disabled={
                  isLookingUp || effectiveReadOnly || isSaving
                }
                onChange={(
                  value,
                ) =>
                  handlePostOfficeChange(
                    value,
                  )
                }
              />

              {postOfficeOptions.length >
                1 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Multiple Post Offices found. Select the correct Post Office.
                  </p>
                )}
            </div>
          )}

        {/* =====================================================
            ASSIGN TO DIVISIONS
            ===================================================== */}

        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-semibold text-foreground">
                COPY TO / ASSIGN TO DIVISIONS
              </span>

              <p className="text-[11px] text-muted-foreground">
                Child divisions only see and use records assigned by HO.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Select / Unselect All */}
              <button
                type="button"
                onClick={() => setSelectedDivisions(allDivisions.map((d) => d.id))}
                className="text-[10px] font-medium text-primary hover:underline"
                title="Select all divisions"
              >
                All
              </button>
              <span className="text-muted-foreground text-[10px]">/</span>
              <button
                type="button"
                onClick={() => setSelectedDivisions([])}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                title="Unselect all divisions"
              >
                None
              </button>

              <span className="text-xs font-bold text-primary ml-1">
                {selectedDivisions.filter(
                  (id) => !allDivisions.find((d) => d.id === id)?.is_ho,
                ).length}{' '}Selected
              </span>
            </div>
          </div>

          {/* ── Search filter ── */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search divisions…"
              value={divisionSearch}
              onChange={(e) => setDivisionSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {divisionSearch && (
              <button
                type="button"
                onClick={() => setDivisionSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-secondary/30">
            {(() => {
              const filtered = allDivisions.filter((d) =>
                d.name.toLowerCase().includes(divisionSearch.toLowerCase()),
              );
              if (filtered.length === 0) {
                return (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    No divisions match &quot;{divisionSearch}&quot;
                  </p>
                );
              }
              return filtered.map((division) => {
                const isSelected = selectedDivisions.includes(division.id);
                return (
                  <button
                    type="button"
                    key={division.id}
                    onClick={() => toggleDivision(division.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="truncate">{division.name}</span>

                    <div className="flex items-center gap-1 shrink-0">
                      {division.is_ho && (
                        <span className="text-[9px] bg-indigo-500/15 text-indigo-600 font-bold px-1 rounded-xs uppercase">
                          HO Locked
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* =====================================================
            ACTIONS
            ===================================================== */}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={
              onClose
            }
            disabled={
              isSaving
            }
          >
            {effectiveReadOnly ? 'Close' : 'Cancel'}
          </Button>

          {!effectiveReadOnly && (
            <Button
              type="submit"
              isLoading={
                isSaving
              }
            >
              {isEditing
                ? 'Save Changes'
                : 'Create & Assign Pincode'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
