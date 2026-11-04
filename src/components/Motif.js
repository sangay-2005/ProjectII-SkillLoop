import Svg, { Path } from 'react-native-svg';

export default function Motif({ width = 60 }) {
  return (
    <Svg width={width} height={width / 5} viewBox="0 0 60 12">
      <Path d="M30,0 L33,6 L30,12 L27,6 Z" fill="#E8A33D" />
      <Path d="M0,6 L25,6 M35,6 L60,6" stroke="#E8A33D" strokeWidth={1} />
    </Svg>
  );
}