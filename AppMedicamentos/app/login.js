import React from 'react';
import Login from '../src/components/InformacionPersonal/Login';
import ConexionInternet from '../src/services/ConexionInternet';

export default function LoginRoute() {
  return (
    <ConexionInternet>
      <Login />
    </ConexionInternet>
  );
}
