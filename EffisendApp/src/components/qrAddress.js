import React, { useEffect } from 'react';
import QRCodeStyled from 'react-native-qrcode-styled';
import { createGlobalStyles } from '../core/styles';
import { useSmartSize } from '../providers/smartProvider';

export default function QrAddress({ address }) {
  const smartSize = useSmartSize();
  const { normalize } = smartSize;
  const GlobalStyles = createGlobalStyles(smartSize);

  useEffect(() => {
    console.log(address);
  }, [address]);

  return (
    <QRCodeStyled
      data={address}
      style={GlobalStyles.qrCode}
      errorCorrectionLevel="H"
      padding={normalize(16)}
      pieceSize={normalize(7)}
      pieceBorderRadius={normalize(4)}
      isPiecesGlued
      color={'black'}
    />
  );
}
