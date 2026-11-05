
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ScreenHeader from '../components/ScreenHeader';
import CategoryChips from '../components/CategoryChips';
import MentorCard from '../components/MentorCard';
import { ratingValue } from '../utils/rating';
import { useFocusEffect } from '@react-navigation/native';
import { loadWithCache } from '../utils/cache';
import { useOnline } from '../utils/connection';

export default function HomeScreen({ navigation }) {
  const [allMentors, setAllMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [userName, setUserName] = useState('');

  // filter panel
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('Any');

  const online = useOnline();

  const loadData = async () => {
    setLoading(true);
    const myUid = auth.currentUser?.uid;

    // Fresh from Firestore when online,
    // the saved copy when offline.
    const data = await loadWithCache(`${myUid}_home`, async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const others = [];
      let myName = '';

      snapshot.forEach((d) => {
        if (d.id === myUid) myName = d.data().displayName;
        else others.push({ id: d.id, ...d.data() });
      });

      return { others, myName };
    });

    if (data) {
      setAllMentors(data.others);
      setUserName(
        auth.currentUser?.displayName ||
        data.myName ||
        auth.currentUser?.email ||
        'there'
      );
    }

    setLoading(false);
  };

  // Reload when the tab is opened,
  // and again when the connection comes back.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [online])
  );

  // options built from the data
  const categories = [
    'All',
    ...new Set(allMentors.map((m) => m.category).filter(Boolean)),
  ];

  const locations = [
    'Any',
    ...new Set(allMentors.map((m) => m.location).filter(Boolean)),
  ];

  const filtersActive =
    sortBy !== 'rating' ||
    minRating > 0 ||
    selectedLocation !== 'Any';

  const text = searchText.trim().toLowerCase();

  const filtered = allMentors
    .filter((m) => {
      const matchCategory =
        activeCategory === 'All' || m.category === activeCategory;

      const matchText =
        !text ||
        (m.displayName || '').toLowerCase().includes(text) ||
        (m.skillsToTeach || []).some((s) =>
          s.toLowerCase().includes(text)
        );

      const matchRating = ratingValue(m) >= minRating;

      const matchLocation =
        selectedLocation === 'Any' || m.location === selectedLocation;

      return (
        matchCategory &&
        matchText &&
        matchRating &&
        matchLocation
      );
    })
    .sort((a, b) =>
      sortBy === 'name'
        ? (a.displayName || '').localeCompare(b.displayName || '')
        : ratingValue(b) - ratingValue(a)
    );

  // "Recommended" shows the top 10 until the user searches or filters
  const shown =
    activeCategory === 'All' && !text && !filtersActive
      ? filtered.slice(0, 10)
      : filtered;

  const resetFilters = () => {
    setSortBy('rating');
    setMinRating(0);
    setSelectedLocation('Any');
  };

  // one option chip inside the filter panel
  const option = (label, selected, onPress) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? '#E8A33D' : '#fff',
        borderWidth: 1,
        borderColor: selected ? '#E8A33D' : '#E5E5E5',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#1F456D',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const sectionLabel = {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F456D',
    marginTop: 14,
    marginBottom: 8,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        small="Kuzu Zangpo,"
        title={userName}
        subtitle="What would you like to learn today?"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 18,
          }}
        >
          {/* search box */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 16,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons name="search" size={18} color="#5F6368" />

            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                marginLeft: 8,
                fontSize: 15,
                color: '#1A1A1A',
              }}
              placeholder="Search skills or people..."
              placeholderTextColor="#8D99AE"
              value={searchText}
              onChangeText={setSearchText}
            />

            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#B9B2A3"
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* filter button */}
          <TouchableOpacity
            onPress={() => setFilterOpen(true)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 10,
            }}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color="#1F456D"
            />

            {filtersActive && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#E8A33D',
                  borderWidth: 1.5,
                  borderColor: '#fff',
                }}
              />
            )}
          </TouchableOpacity>
        </View>
      </ScreenHeader>

      <View style={{ marginTop: 16 }}>
        <CategoryChips
          categories={categories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
      </View>

      <Text
        style={{
          fontSize: 17,
          fontWeight: 'bold',
          color: '#1F456D',
          marginHorizontal: 20,
          marginTop: 16,
          marginBottom: 10,
        }}
      >
        Recommended For You
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#E8A33D"
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MentorCard
              mentor={item}
              onPress={() =>
                navigation.navigate('MentorProfile', {
                  mentorId: item.id,
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: 'center',
                color: '#5F6368',
                marginTop: 20,
              }}
            >
              No mentors found.
            </Text>
          }
        />
      )}

      {/* filter panel */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setFilterOpen(false)}
          />

          <View
            style={{
              backgroundColor: '#FAF7F0',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              paddingBottom: 30,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#1F456D',
                }}
              >
                Filters
              </Text>

              <TouchableOpacity
                onPress={() => setFilterOpen(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#1F456D"
                />
              </TouchableOpacity>
            </View>

            <Text style={sectionLabel}>Sort by</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {option(
                'Top rated',
                sortBy === 'rating',
                () => setSortBy('rating')
              )}
              {option(
                'Name A-Z',
                sortBy === 'name',
                () => setSortBy('name')
              )}
            </View>

            <Text style={sectionLabel}>Minimum rating</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {option('Any', minRating === 0, () => setMinRating(0))}
              {option('4.0+', minRating === 4, () => setMinRating(4))}
              {option('4.5+', minRating === 4.5, () => setMinRating(4.5))}
            </View>

            <Text style={sectionLabel}>Location</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {locations.map((loc) =>
                option(
                  loc,
                  selectedLocation === loc,
                  () => setSelectedLocation(loc)
                )
              )}
            </View>

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity
                onPress={resetFilters}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#1F456D',
                  marginRight: 10,
                }}
              >
                <Text
                  style={{
                    color: '#1F456D',
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}
                >
                  Reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterOpen(false)}
                style={{
                  flex: 2,
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: '#1F456D',
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}
                >
                  Show {filtered.length}{' '}
                  {filtered.length === 1 ? 'mentor' : 'mentors'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
