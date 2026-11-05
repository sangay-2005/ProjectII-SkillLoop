
import { useContext } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function KeyboardScreen({
  children,
  contentContainerStyle,
  style,
}) {
  const headerHeight = useContext(HeaderHeightContext) || 0;
  const isIOS = Platform.OS === 'ios';

  const scroll = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { flexGrow: 1, backgroundColor: '#FAF7F0' },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={isIOS ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={isIOS}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: '#FAF7F0' }, style]}
      edges={['top', 'bottom']}
    >
      {isIOS ? (
        scroll
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={headerHeight}
        >
          {scroll}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
