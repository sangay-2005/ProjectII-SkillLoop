import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shows 1 to 5 stars. Pass onChange to make the stars tappable.
export default function StarRating({ value = 0, onChange, size = 20 }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = (
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color="#E8A33D"
            style={{ marginRight: 3 }}
          />
        );
        return onChange ? (
          <TouchableOpacity key={star} onPress={() => onChange(star)}>
            {icon}
          </TouchableOpacity>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}