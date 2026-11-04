import { ScrollView, TouchableOpacity, Text } from 'react-native';
import SkillIcon from './SkillIcon';

export default function CategoryChips({ categories, active, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
    >
      {categories.map((cat) => {
        const selected = active === cat;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelect(cat)}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: selected ? '#E8A33D' : '#fff',
              paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, marginRight: 10,
              borderWidth: 1, borderColor: selected ? '#E8A33D' : '#E5E5E5',
            }}
          >
            <SkillIcon category={cat} size={16} color="#1F456D" />
            <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#1F456D' }}>{cat}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}