import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import InformacionPerfil from '../src/components/PanelPrincipal/MiPerfil/InformacionPerfil';
import ConexionInternet from '../src/services/ConexionInternet';

export default function PerfilRoute() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <ConexionInternet>
      <InformacionPerfil onBack={handleBack} />
    </ConexionInternet>
  );
}
