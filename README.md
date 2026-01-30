# BreachBuddy Frontend

A modern, responsive Next.js 14 frontend for BreachBuddy - a next-generation security dashboard.

## Features

- **Hero Section**: Eye-catching landing page with call-to-action
- **Features Page**: Comprehensive list of security features
- **Pricing Page**: Multiple pricing tiers with detailed features
- **About Page**: Company information and team details
- **Blog Page**: Security insights and articles
- **Contact Page**: Customer support contact form
- **Authentication Pages**: Login and signup pages
- **Legal Pages**: Privacy policy and terms of service

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
# or
yarn install
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Pages

- `/` - Homepage with hero section
- `/features` - Features overview
- `/pricing` - Pricing plans
- `/about` - About BreachBuddy
- `/blog` - Security blog
- `/contact` - Contact us form
- `/login` - User login
- `/signup` - User registration
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## Components

- `Navigation` - Top navigation bar with responsive menu
- `Footer` - Site footer with links and info
- `HeroSection` - Landing page hero section
- `FeaturesSection` - Features showcase
- `AboutSection` - About section on homepage
- `CTASection` - Call-to-action section

## Technologies Used

- **Next.js 14**: React framework with app router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Lucide React**: Icon library

## Styling

The project uses Tailwind CSS for styling. Global styles are in `app/globals.css` with custom utility classes for buttons and sections.

## Deployment

Build for production:

```bash
npm run build
npm start
```

Deploy to Vercel or your preferred hosting platform.

## License

All rights reserved © 2026 BreachBuddy
