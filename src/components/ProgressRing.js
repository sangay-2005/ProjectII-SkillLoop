import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// A circular progress indicator, used on the Learning and Loop screens
export default function ProgressRing({ percent = 0, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // how much of the circle to leave empty
  const offset = circumference - (circumference * percent) / 100;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* grey track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#EFE7D6" strokeWidth={strokeWidth} fill="none"
        />
        {/* gold progress arc, starting from the top */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E8A33D" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: size * 0.24, fontWeight: 'bold', color: '#1F456D' }}>
        {percent}%
      </Text>
    </View>
  );
}