import { Alert, Platform } from 'react-native';

/** Alert.alert ne fait rien sur le web : on passe par window.confirm / alert. */
export function confirmAsk(title: string, message: string, okLabel: string, onOk: () => void, cancelLabel = 'Annuler') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onOk },
  ]);
}

export function inform(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
