import type { LangCode } from '@/features/publicApply/types'

export type I18nKey =
  | 'appTitle'
  | 'loading'
  | 'invalidLink'
  | 'loadError'
  | 'submitError'
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'mobile'
  | 'role'
  | 'otherRole'
  | 'otherRolePlaceholder'
  | 'language'
  | 'resume'
  | 'resumeRequired'
  | 'submit'
  | 'submitting'
  | 'successTitle'
  | 'successDesc'
  | 'duplicateWarning'
  | 'backToHome'
  | 'mobileInvalid'
  | 'required'
  | 'ageRange'
  | 'expTooHigh'
  | 'salaryTooHigh'
  | 'joiningPast'
  | 'maxFiles'
  | 'fileTooLarge'
  | 'fileTypeNotAllowed'
  | 'contactDetails'
  | 'applyingFor'
  | 'generalInfo'
  | 'documents'
  | 'tapToUpload'
  | 'uploadHint'
  | 'idProof'
  | 'certificate'
  | 'otherDocs'
  | 'selectOption'
  | 'roleSpecificInfo'

const dict: Record<LangCode, Record<I18nKey, string>> = {
  en: {
    appTitle: 'Logicon Facility Management',
    loading: 'Loading...',
    invalidLink: 'This link is invalid or expired.',
    loadError: 'Could not load this campaign. Please try again later.',
    submitError: 'Could not submit. Please check your inputs and try again.',
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    mobile: 'Mobile Number',
    role: 'Role',
    otherRole: 'Other role title',
    otherRolePlaceholder: 'Enter role title',
    language: 'Language',
    resume: 'Resume / CV',
    resumeRequired: 'Resume is required.',
    submit: 'Submit Application',
    submitting: 'Submitting...',
    successTitle: 'Application submitted',
    successDesc: 'Thank you. Your submission has been received.',
    duplicateWarning: 'Note: This looks like a possible duplicate submission.',
    backToHome: 'Back',
    mobileInvalid: 'Enter a valid 10-digit Indian mobile number starting with 6/7/8/9.',
    required: 'This field is required.',
    ageRange: 'Age must be between 18 and 60.',
    expTooHigh: 'Experience years cannot be greater than age minus 14.',
    salaryTooHigh: 'Expected salary cannot exceed 500000.',
    joiningPast: 'Joining availability cannot be in the past.',
    maxFiles: 'A maximum of 5 files can be uploaded.',
    fileTooLarge: 'File exceeds the 10 MB limit.',
    fileTypeNotAllowed: 'Unsupported file type.',
    contactDetails: 'Contact Details',
    applyingFor: 'Applying For',
    generalInfo: 'General Information',
    documents: 'Documents',
    tapToUpload: 'Tap to upload file',
    uploadHint: 'PDF, DOC, DOCX, JPG, PNG — max 10 MB each, 5 files total',
    idProof: 'ID Proof',
    certificate: 'Certificate',
    otherDocs: 'Other Documents',
    selectOption: 'Select',
    roleSpecificInfo: 'Role specific information',
  },
  hi: {
    appTitle: 'लॉजिकॉन फैसिलिटी मैनेजमेंट',
    loading: 'लोड हो रहा है...',
    invalidLink: 'यह लिंक अमान्य या समाप्त हो चुका है।',
    loadError: 'कैंपेन लोड नहीं हो सका। कृपया बाद में फिर प्रयास करें।',
    submitError: 'सबमिट नहीं हो सका। कृपया जानकारी जांचें और फिर प्रयास करें।',
    firstName: 'पहला नाम',
    middleName: 'मध्य नाम',
    lastName: 'अंतिम नाम',
    mobile: 'मोबाइल नंबर',
    role: 'भूमिका',
    otherRole: 'अन्य भूमिका',
    otherRolePlaceholder: 'भूमिका लिखें',
    language: 'भाषा',
    resume: 'रेज्यूमे / सीवी',
    resumeRequired: 'रेज्यूमे आवश्यक है।',
    submit: 'आवेदन जमा करें',
    submitting: 'सबमिट हो रहा है...',
    successTitle: 'आवेदन सबमिट हो गया',
    successDesc: 'धन्यवाद। आपका आवेदन प्राप्त हो गया है।',
    duplicateWarning: 'नोट: यह संभवतः डुप्लिकेट सबमिशन है।',
    backToHome: 'वापस',
    mobileInvalid: '6/7/8/9 से शुरू होने वाला 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।',
    required: 'यह फील्ड आवश्यक है।',
    ageRange: 'आयु 18 से 60 के बीच होनी चाहिए।',
    expTooHigh: 'अनुभव आयु से 14 घटाने पर आने वाली संख्या से अधिक नहीं हो सकता।',
    salaryTooHigh: 'अपेक्षित वेतन 500000 से अधिक नहीं हो सकता।',
    joiningPast: 'जॉइनिंग तारीख आज से पहले नहीं हो सकती।',
    maxFiles: 'अधिकतम 5 फाइलें अपलोड की जा सकती हैं।',
    fileTooLarge: 'फाइल 10 MB सीमा से बड़ी है।',
    fileTypeNotAllowed: 'यह फाइल प्रकार समर्थित नहीं है।',
    contactDetails: 'संपर्क विवरण',
    applyingFor: 'किस पद के लिए आवेदन',
    generalInfo: 'सामान्य जानकारी',
    documents: 'दस्तावेज़',
    tapToUpload: 'फाइल अपलोड करने के लिए टैप करें',
    uploadHint: 'PDF, DOC, DOCX, JPG, PNG — अधिकतम 10 MB प्रति फाइल, 5 फाइलें कुल',
    idProof: 'पहचान प्रमाण',
    certificate: 'प्रमाणपत्र',
    otherDocs: 'अन्य दस्तावेज़',
    selectOption: 'चुनें',
    roleSpecificInfo: 'भूमिका संबंधित जानकारी',
  },
  mr: {
    appTitle: 'लॉजिकॉन फॅसिलिटी मॅनेजमेंट',
    loading: 'लोड होत आहे...',
    invalidLink: 'ही लिंक अवैध आहे किंवा कालबाह्य झाली आहे.',
    loadError: 'कॅम्पेन लोड झाले नाही. कृपया नंतर पुन्हा प्रयत्न करा.',
    submitError: 'सबमिट झाले नाही. कृपया माहिती तपासा आणि पुन्हा प्रयत्न करा.',
    firstName: 'पहिले नाव',
    middleName: 'मधले नाव',
    lastName: 'आडनाव',
    mobile: 'मोबाइल नंबर',
    role: 'भूमिका',
    otherRole: 'इतर भूमिका',
    otherRolePlaceholder: 'भूमिका लिहा',
    language: 'भाषा',
    resume: 'रेझ्युमे / सीव्ही',
    resumeRequired: 'रेझ्युमे आवश्यक आहे.',
    submit: 'अर्ज सबमिट करा',
    submitting: 'सबमिट होत आहे...',
    successTitle: 'अर्ज सबमिट झाला',
    successDesc: 'धन्यवाद. आपला अर्ज प्राप्त झाला आहे.',
    duplicateWarning: 'नोंद: हे सबमिशन संभाव्य डुप्लिकेट आहे.',
    backToHome: 'मागे',
    mobileInvalid: '6/7/8/9 ने सुरू होणारा 10 अंकी भारतीय मोबाइल नंबर टाका.',
    required: 'हे फील्ड आवश्यक आहे.',
    ageRange: 'वय 18 ते 60 दरम्यान असणे आवश्यक आहे.',
    expTooHigh: 'अनुभव वयातून 14 वजा केल्यावर येणाऱ्या संख्येपेक्षा जास्त असू शकत नाही.',
    salaryTooHigh: 'अपेक्षित पगार 500000 पेक्षा जास्त नसावा.',
    joiningPast: 'जॉइनिंग तारीख आजच्या आधीची असू शकत नाही.',
    maxFiles: 'जास्तीत जास्त 5 फाइल्स अपलोड करता येतील.',
    fileTooLarge: 'फाइल 10 MB मर्यादेपेक्षा मोठी आहे.',
    fileTypeNotAllowed: 'हा फाइल प्रकार समर्थित नाही.',
    contactDetails: 'संपर्क तपशील',
    applyingFor: 'कोणत्या पदासाठी अर्ज',
    generalInfo: 'सामान्य माहिती',
    documents: 'कागदपत्रे',
    tapToUpload: 'फाइल अपलोड करण्यासाठी टॅप करा',
    uploadHint: 'PDF, DOC, DOCX, JPG, PNG — प्रत्येकी जास्तीत जास्त 10 MB, एकूण 5 फाइल्स',
    idProof: 'ओळखपत्र',
    certificate: 'प्रमाणपत्र',
    otherDocs: 'इतर कागदपत्रे',
    selectOption: 'निवडा',
    roleSpecificInfo: 'भूमिका संबंधित माहिती',
  },
}

export function t(lang: LangCode, key: I18nKey): string {
  return dict[lang]?.[key] ?? dict.en[key]
}
