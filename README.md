# R-Tudo - English Learning Platform

R-Tudo is a comprehensive English learning web application built with Next.js. It features an interactive learning experience with AI-powered assessments, personalized dashboards, and gamified learning elements.

## Features

- 🎯 **Personalized Learning**: Customized learning paths based on user progress
- 🤖 **AI-Powered Assessments**: Speaking and writing evaluation using OpenAI
- 📚 **Interactive Lessons**: Structured lessons with progress tracking
- 👤 **User Profiles**: Complete user management with achievements and stats
- 🔥 **Gamification**: XP system, daily goals, and progress tracking
- 🎤 **Speaking Practice**: Voice recording and AI evaluation
- ✍️ **Writing Practice**: Text-based exercises with AI feedback

## Tech Stack

- **Framework**: Next.js 15.4.2 with React 19
- **Styling**: Tailwind CSS 4
- **Authentication**: Firebase Auth with Google integration
- **Database**: Firebase Firestore
- **AI Integration**: OpenAI API for assessments
- **Icons**: Lucide React & React Icons
- **Date Handling**: Day.js and date-fns

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
