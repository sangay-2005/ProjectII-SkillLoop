
# SkillLoop - Learn. Share. Repeat.

SkillLoop is a cross-platform skill-exchange mobile application developed using React Native (Expo) and Firebase. It connects people who want to learn new skills with people who are willing to share their knowledge.

Learners can discover mentors, send learning requests, communicate through real-time messaging, arrange learning sessions, and track their learning progress.

**Project:** CTE308 - Mobile Application Development (Project-II)
**Institution:** College of Science and Technology (CST)
**University:** Royal University of Bhutan (RUB)

---

## Features

### 1. User Authentication and Profile Management
- User registration and login using email and password.
- User profile creation and management.
- Edit profile information and teaching details.
- Firebase Authentication.

### 2. Skill Discovery
- Browse available skills and mentors.
- Search for skills and filter by categories.
- View mentor profiles and teaching information.
- Send learning requests to mentors.

### 3. Learning Requests
- View received and sent learning requests.
- Accept or decline learning requests.
- Manage active learning connections.
- Track learning journeys and milestones.

### 4. Real-Time Messaging
- In-app messaging between mentors and learners.
- Real-time message updates using Cloud Firestore.
- Sent and seen message indicators.
- Conversation list with unread message indicators.

### 5. Learning Session Management
- Propose online or in-person learning sessions.
- Accept, decline, reschedule, or cancel sessions.
- Add online meeting links or in-person locations.
- View session details and manage session status.
- Mark confirmed sessions as completed.

### 6. Practice Journal and Progress Tracking
- Record learning activities through a practice journal.
- Track learning progress and milestones.
- Monitor learning streaks.
- Each journal entry contributes to overall learning progress.

### 7. Ratings and Reviews
- Rate and review mentors.
- Display mentor ratings and reviews.
- Calculate average ratings.

### 8. Push Notifications
- Register device push notification tokens.
- Handle notifications for new learning requests.
- Handle notifications when learning requests are accepted.
- Handle notifications for new chat messages.
- Manage notification tokens during logout and account switching.

**Note:** Push notification registration and handling are implemented. Actual remote notification delivery still requires end-to-end testing using an Expo development build.

### 9. Offline Support
- View previously saved application data without an internet connection.
- Cache important application information.
- Restrict actions that require an internet connection.
- Display saved information while offline.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile application development |
| Expo | Development and application tooling |
| JavaScript | Application programming |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database and real-time updates |
| React Navigation | Application navigation |
| Expo Notifications | Push notification implementation |
| AsyncStorage | Local data caching |
| NetInfo | Network connectivity monitoring |
| React Native SVG | Scalable vector graphics |

---

## Application Structure

```text
SkillLoop/
|
|-- assets/
|
|-- src/
|   |-- components/
|   |
|   |-- config/
|   |   |-- firebase.js
|   |
|   |-- hooks/
|   |
|   |-- navigation/
|   |
|   |-- screens/
|   |   |-- auth/
|   |   |-- ...
|   |
|   |-- utils/
|
|-- App.js
|-- app.json
|-- package.json
|-- package-lock.json
|-- README.md
```

---

## Installation and Setup

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- Git
- Expo development environment
- Android Studio or a compatible iOS development environment

### 1. Clone the Repository

```bash
git clone https://github.com/sangay-2005/ProjectII-SkillLoop.git
```

### 2. Navigate to the Project Directory

```bash
cd ProjectII-SkillLoop
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Firebase

1. Create or open a Firebase project.
2. Enable Email/Password authentication in Firebase Authentication.
3. Create a Cloud Firestore database.
4. Configure the Firebase application.
5. Update the Firebase configuration in:

```text
src/config/firebase.js
```

Ensure that the Firebase configuration matches the project setup.

### 5. Start the Application

```bash
npx expo start
```

If the Expo command through npx is unavailable in your environment, use:

```bash
node node_modules/expo/bin/cli start
```

Scan the QR code using Expo Go or run the application using an appropriate development environment.

---

## Database Structure

SkillLoop uses Cloud Firestore to store user and application information.

The main collections include:

```text
users/
usernames/
requests/
    |-- requestId/
        |-- messages/
        |-- progress/
        |-- sessions/
reviews/
```

---

## Offline Support

SkillLoop provides offline viewing through locally cached application data. Users can access previously saved information without an internet connection.

Actions that require Firebase connectivity are restricted while offline. Live information is updated when the device reconnects.

---

## Push Notification Support

Push notification functionality is implemented using Expo Notifications.

The application includes notification handling for:

- New learning requests.
- Accepted learning requests.
- New chat messages.

A development build is recommended for testing remote push notification delivery because Expo Go has limitations for remote notifications.

---

## Project Objective

SkillLoop aims to encourage collaborative learning and knowledge sharing by connecting individuals with different skills and experiences.

The application provides a convenient platform for discovering mentors, communicating, arranging learning sessions, and monitoring personal learning progress.

Through SkillLoop, users can both share their knowledge and learn new skills from others.

**Learn. Share. Repeat.**

---

## Developer

**Sangay Wangzom**
Information Technology
College of Science and Technology
Royal University of Bhutan

---

## GitHub Repository

https://github.com/sangay-2005/ProjectII-SkillLoop
