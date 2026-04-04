import React from 'react';
import BuscarMedicamento from '../src/components/PanelPrincipal/BuscarMedicamento/BuscarMedicamento';
import ConexionInternet from '../src/services/ConexionInternet';

export default function BuscarRoute() {
  return (
    <ConexionInternet>
      <BuscarMedicamento />
    </ConexionInternet>
  );
}
