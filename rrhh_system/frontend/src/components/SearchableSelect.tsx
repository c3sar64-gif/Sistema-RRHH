// src/components/SearchableSelect.tsx
import { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';

// Un ícono de selector para el botón
const SelectorIcon = () => (
  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.5 9.5a.75.75 0 011.06 0L10 15.19l3.47-3.47a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);
// Un ícono de check para la opción seleccionada
const CheckIcon = () => (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
    </svg>
);


interface Option {
    id: number;
    nombre: string;
}

interface SearchableSelectProps {
    options: Option[];
    selected: Option | null;
    onChange: (value: Option | null) => void;
    label: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, selected, onChange, label }) => {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.nombre.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
        );

  return (
    <div className="w-full">
        <Combobox value={selected} onChange={onChange}>
            <Combobox.Label className="block text-sm font-medium text-gray-700">{label}</Combobox.Label>
            <div className="relative mt-1">
                {/* Contenedor principal que simula el input */}
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:border-indigo-500">
                    <Combobox.Input
                        className="w-full border-none py-2.5 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                        displayValue={(option: Option | null) => option?.nombre || ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar..."
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <SelectorIcon />
                    </Combobox.Button>
                </div>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('')}
                >
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg border border-gray-200 focus:outline-none sm:text-sm z-20">
                    {filteredOptions.length === 0 && query !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            No se encontró nada.
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                        <Combobox.Option
                            key={option.id}
                            className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                            }`
                            }
                            value={option}
                        >
                            {({ selected, active }) => (
                            <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {option.nombre}
                                </span>
                                {selected ? (
                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-indigo-600'}`}>
                                    <CheckIcon />
                                </span>
                                ) : null}
                            </>
                            )}
                        </Combobox.Option>
                        ))
                    )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    </div>
  );
};
