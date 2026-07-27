import type it from './it';

const en: typeof it = {
  common: {
    appName: 'AllergiApp Partner',
    loading: 'Loading…',
    comingSoon: 'Coming soon',
    signOut: 'Sign out',
  },
  nav: {
    showcase: 'Showcase',
    venue: 'Venue',
    account: 'Account',
  },
  login: {
    title: 'AllergiApp Partner',
    subtitle: 'The portal for restaurateurs',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    signUpCta: 'Sign up',
    signInCta: 'Sign in',
    checkEmail: 'Check your inbox to confirm your registration.',
    genericError: 'Something went wrong. Please try again.',
  },
  home: {
    title: 'Your showcase',
    intro:
      'This is where you build your venue’s showcase: dishes with their allergens, useful links and more. Fill it in at your own pace as a private draft: nothing will be visible in the app until you decide to publish it.',
    draftBadge: 'Private draft',
    dishesCard: 'Dishes and allergens',
    dishesCardDescription:
      'Declare the dishes on your menu and the allergens in each one.',
    linksCard: 'Useful links',
    linksCardDescription:
      'Reservations, delivery, menu and website for your venue.',
  },
  venue: {
    title: 'Your venue',
    intro:
      'This is where you will link your account to your venue on AllergiApp, by searching for it by name and city.',
    notFoundBridge:
      'Can’t find your venue? Add it from the AllergiApp app, then come back here to request management.',
  },
  account: {
    title: 'Account',
    email: 'Email',
    language: 'Language',
  },
};

export default en;
