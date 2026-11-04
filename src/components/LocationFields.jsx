import { ASIR_CITIES, CUSTOM_DISTRICT, districtsOf } from '../lib/asir';
import { Field, inputClass } from './ui';

export default function LocationFields({ city, districtChoice, customDistrict, onChange }) {
  const districts = districtsOf(city);

  function changeCity(nextCity) {
    onChange({
      city: nextCity,
      districtChoice: districtsOf(nextCity)[0] || CUSTOM_DISTRICT,
      customDistrict: '',
    });
  }

  function changeDistrict(nextDistrict) {
    onChange({
      city,
      districtChoice: nextDistrict,
      customDistrict: nextDistrict === CUSTOM_DISTRICT ? customDistrict : '',
    });
  }

  return (
    <>
      <Field label="المدينة">
        <select className={inputClass} value={city} onChange={(event) => changeCity(event.target.value)}>
          {ASIR_CITIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="الحي">
        <select
          className={inputClass}
          value={districtChoice}
          onChange={(event) => changeDistrict(event.target.value)}
        >
          {districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={CUSTOM_DISTRICT}>حي آخر — اكتبه</option>
        </select>
      </Field>
      {districtChoice === CUSTOM_DISTRICT ? (
        <Field label="اسم الحي">
          <input
            className={inputClass}
            maxLength={40}
            value={customDistrict}
            placeholder="اكتب اسم الحي إن لم تجده في القائمة"
            onChange={(event) =>
              onChange({
                city,
                districtChoice,
                customDistrict: event.target.value,
              })
            }
          />
        </Field>
      ) : null}
    </>
  );
}
