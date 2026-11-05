# SkillLoop

A cross-platform (Android and iOS) community skill-exchange app for Bhutan, built with React Native (Expo) and Firebase.
Learners find mentors, send requests, and track their progress. The teaching itself happens in real life, outside the app.

Project-II for CTE308 Mobile Application Development, College of Science and Technology, RUB.

## Features

From Project-I (rebuilt in React Native):
- Email sign-up, login and profile setup
- Home with search, category chips and filters
- Discover, mentor profiles and request to exchange
- Requests (received, sent, active), learning journey, milestones and practice journal

New in Project-II:
- Real-time in-app chat between mentor and learner
- Notifications for new requests, accepted requests and messages
- Ratings and reviews (average recalculated automatically)
- Offline view-only mode with saved data
- Edit profile and mentor-chosen teaching details

## Tech stack

React Native (Expo), Firebase Authentication, Cloud Firestore, React Navigation,
Expo Notifications, AsyncStorage and NetInfo, react-native-svg.

## Folder structure

```
App.js                  app entry, offline banner
src/config/             Firebase setup
src/navigation/         stacks and bottom tabs
src/screens/            one file per screen (auth screens in auth/)
src/components/         reusable UI: Avatar, ScreenHeader, MentorCard, StarRating...
src/hooks/              live notification listeners
src/utils/              cache, connection, rating, reviews, notifications helpers
```

## Run it

```
npm install
npx expo start
```

Then scan the QR code with Expo Go. Firebase settings are in `src/config/firebase.js`.