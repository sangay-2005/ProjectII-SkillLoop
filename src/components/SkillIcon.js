import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const PATHS = {
  Technology: 'M9.4,16.6L4.8,12l4.6,-4.6L8,6l-6,6 6,6 1.4,-1.4zM14.6,16.6l4.6,-4.6 -4.6,-4.6L16,6l6,6 -6,6 -1.4,-1.4z',
  Cooking: 'M11,9H9V2H7v7H5V2H3v7c0,2.12 1.66,3.84 3.75,3.97V22h2.5v-9.03C11.34,12.84 13,11.12 13,9V2h-2v7zm5,-3v8h2.5v8H21V2c-2.76,0 -5,2.24 -5,4z',
  Dzongkha: 'M4,9h16v2H4zm0,4h16v2H4zm0,-8h16v2H4zm0,12h16v2H4z',
  Arts: 'M9,2L7.17,4H4c-1.1,0 -2,0.9 -2,2v12c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2V6c0,-1.1 -0.9,-2 -2,-2h-3.17L15,2H9zm3,15c-2.76,0 -5,-2.24 -5,-5s2.24,-5 5,-5 5,2.24 5,5 -2.24,5 -5,5z',
};
const FALLBACK = { All: 'apps-outline', Music: 'musical-notes-outline' };

export default function SkillIcon({ category, size = 18, color = '#1F456D' }) {
  if (PATHS[category]) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={PATHS[category]} fill={color} />
      </Svg>
    );
  }
  return <Ionicons name={FALLBACK[category] || 'sparkles-outline'} size={size} color={color} />;
}