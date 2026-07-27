import type it from './it';

const en: typeof it = {
  common: {
    appName: 'AllergiApp Partner',
    loading: 'Loading…',
    comingSoon: 'Coming soon',
    signOut: 'Sign out',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
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
      'Fill in your venue’s showcase and watch on the right exactly how it will appear in the app. It is a private draft: nothing will be visible until you decide to publish it.',
    draftBadge: 'Private draft',
  },
  editor: {
    venueNameLabel: 'Venue name',
    venueNamePlaceholder: 'Your restaurant',
    venueNameHint: 'For now it only feeds the preview: once linked to your venue it will come from AllergiApp.',
    dishesTitle: 'Dishes and allergens',
    addDish: 'Add dish',
    dishName: 'Dish name',
    dishNamePlaceholder: 'E.g. Spaghetti carbonara',
    dishDescription: 'Description (optional)',
    dishDescriptionPlaceholder: 'Main ingredients, preparation…',
    dishAllergens: 'Allergens present in the dish',
    dishAllergensHint:
      'Select the allergens the dish contains, as already required by EU Reg. 1169/2011.',
    noDishes: 'No dishes yet. Add the first one: you will see it in the preview right away.',
    dishNoAllergens: 'No allergens',
    linksTitle: 'Useful links',
    linksHint: 'Fill in only the ones you have: they will appear as buttons in the app.',
    linkBooking: 'Reservations',
    linkDelivery: 'Delivery',
    linkMenu: 'Menu',
    linkWebsite: 'Website',
    linkPlaceholder: 'https://…',
    previewButton: 'Preview',
    previewCaption:
      'Preview of the app listing. Reviews and ratings are sample data: the real ones come from the community.',
  },
  preview: {
    directions: 'Directions',
    reviewsCount: '(23)',
    address: 'Via Roma 12, Milan',
    cuisine: 'Italian',
    compat: 'Covers 3 of your 4 needs',
    menuTitle: 'Menu',
    declaredBy: 'Declared by the restaurateur',
    updatedToday: 'updated today',
    contains: 'Contains:',
    noAllergensDeclared: 'None of the 15 allergens declared by the restaurateur',
    disclaimer:
      'Information provided by the restaurateur, referring to ingredients. Cross-contamination in the kitchen cannot be ruled out: always tell the staff about your allergies.',
    menuEmptyPlaceholder: 'Your dishes will appear here',
    reviewsTitle: 'Reviews',
    sampleReviewerName: 'Giulia',
    sampleReviewDate: '2 weeks ago',
    sampleReviewText:
      'Staff extremely careful with allergies: they checked every ingredient and suggested alternatives. Fantastic experience!',
    samplePillGreen: 'Gluten-free',
    samplePillAmber: 'Lactose-free',
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
