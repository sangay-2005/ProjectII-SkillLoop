import Svg, { Circle, Path } from 'react-native-svg';

export default function OnboardingHero({ size = 200 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle cx="100" cy="100" r="90" fill="#E1F5FE" />
      <Path d="M30,140 L70,80 L110,140 Z" fill="#1F456D" fillOpacity={0.08} />
      <Path d="M80,140 L130,60 L180,140 Z" fill="#1F456D" fillOpacity={0.125} />
      <Path d="M60,150 Q75,110 90,150 L90,170 L60,170 Z" fill="#1F456D" />
      <Circle cx="75" cy="102" r="8" fill="#1F456D" />
      <Path d="M110,150 Q125,100 140,150 L140,170 L110,170 Z" fill="#E8A33D" />
      <Circle cx="125" cy="95" r="10" fill="#E8A33D" />
      <Path d="M90,110 Q105,90 120,110" stroke="#E8A33D" strokeWidth={2} fill="none" />
    </Svg>
  );
}