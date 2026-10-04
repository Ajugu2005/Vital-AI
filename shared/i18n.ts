// Predefined core messages for each supported language.
// Shared by the server (replies) and the client (intro / language switch).
// NOTE: Yoruba, Igbo and Hausa strings should be reviewed by native speakers before real use.

export type Language = "en" | "pidgin" | "yoruba" | "igbo" | "hausa";

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "Nigerian English", native: "English" },
  { code: "pidgin", label: "Nigerian Pidgin", native: "Naijá" },
  { code: "yoruba", label: "Yoruba", native: "Yorùbá" },
  { code: "igbo", label: "Igbo", native: "Igbo" },
  { code: "hausa", label: "Hausa", native: "Hausa" },
];

export type MessageKey =
  | "intro"
  | "askLanguage"
  | "languageSet"
  | "askFeeling"
  | "askMedication"
  | "askSymptoms"
  | "askFollowUp"
  | "ackBetter"
  | "ackNotBetter"
  | "ackMedsYes"
  | "ackMedsNo"
  | "ackNoSymptoms"
  | "ackFollowUpYes"
  | "ackFollowUpNeed"
  | "complete"
  | "urgent"
  | "noted"
  | "escalated"
  | "medicationSafety";

export const MESSAGES: Record<Language, Record<MessageKey, string>> = {
  en: {
    intro:
      "Hello, I'm Vital AI, an AI post-discharge follow-up assistant. I'm not a doctor, but I can check in on your recovery and help connect you with your healthcare team.",
    askLanguage:
      "Which language would you prefer? You can choose English, Nigerian Pidgin, Yoruba, Igbo or Hausa using the selector above.",
    languageSet: "Great — we'll continue in English.",
    askFeeling: "How have you been feeling since you left the hospital?",
    askMedication: "Are you taking your medication according to the instructions from your healthcare team?",
    askSymptoms: "Have you noticed any new, worsening or concerning symptoms?",
    askFollowUp: "Do you have a follow-up appointment, or would you like help arranging follow-up care?",
    ackBetter: "Thank you for sharing. I'm glad to hear you're feeling better.",
    ackNotBetter: "Thank you for telling me. I'm sorry you're not feeling your best yet.",
    ackMedsYes: "It's good that you're taking your medication as instructed.",
    ackMedsNo:
      "Please don't stop or change your medication on your own — contact your healthcare team or pharmacist for advice about your prescription.",
    ackNoSymptoms: "Thank you — it's reassuring that you haven't noticed any new symptoms.",
    ackFollowUpYes: "Please make sure you keep your follow-up appointment.",
    ackFollowUpNeed:
      "I've noted that you'd like help with follow-up care. A member of your care team can contact you.",
    complete:
      "Your follow-up check-in is complete. Keep following your healthcare team's instructions and rest well. If you notice new or worsening symptoms, please seek medical care promptly.",
    urgent:
      "That may need urgent medical attention. Please seek immediate medical care or contact your local emergency service. If you are in Lagos, you can call 112 or 767. If possible, have someone stay with you and help you get medical care. I have flagged this for a healthcare professional.",
    medicationSafety:
      "I can't advise on changing your dose. Please don't double up or change how you take your medicine on your own. Follow the instructions from your healthcare team, and call your doctor or pharmacist to ask what to do about the missed dose.",
    noted: "Thank you, I've noted your message.",
    escalated:
      "Your case {caseId} has been sent to a healthcare professional. If your symptoms are severe, do not wait — go to the nearest hospital or call 112 now.",
  },
  pidgin: {
    intro:
      "Hello, na me be Vital AI, AI assistant wey dey follow up patients after dem comot hospital. I no be doctor, but I fit check how your body dey and help connect you with your health team.",
    askLanguage:
      "Which language you go like make we use? You fit choose English, Pidgin, Yoruba, Igbo or Hausa for the selector for top.",
    languageSet: "Okay — we go continue for Pidgin.",
    askFeeling: "How you dey feel since you comot from hospital?",
    askMedication: "You dey take your medicine the way your health team tell you?",
    askSymptoms: "You don notice any new sign, or anything wey dey worse or wey dey worry you?",
    askFollowUp: "You get appointment to go back see doctor, or you want make we help you arrange am?",
    ackBetter: "Thank you say you tell me. E sweet me say you dey feel better.",
    ackNotBetter: "Thank you say you tell me. Sorry say your body never too dey well.",
    ackMedsYes: "E good say you dey take your medicine as dem tell you.",
    ackMedsNo:
      "Abeg no stop or change your medicine by yourself — talk to your health team or pharmacist first.",
    ackNoSymptoms: "Thank you — e good say you never notice any new sign.",
    ackFollowUpYes: "Abeg make sure say you go your follow-up appointment.",
    ackFollowUpNeed: "I don note say you need help with follow-up. Person from your care team go contact you.",
    complete:
      "Your follow-up check-in don complete. Continue to follow wetin your health team tell you and rest well. If you notice any new sign or e dey worse, abeg go see doctor quick-quick.",
    urgent:
      "That one fit need urgent medical attention. Abeg go hospital now-now or call emergency service. If you dey Lagos, you fit call 112 or 767. If e possible, make person stay with you and help you reach hospital. I don flag am for health worker.",
    medicationSafety:
      "I no fit tell you make you change your dose. Abeg no double am or change how you dey take your medicine by yourself. Follow wetin your health team tell you, and call your doctor or pharmacist make dem tell you wetin to do about the dose wey you miss.",
    noted: "Thank you, I don note wetin you talk.",
    escalated:
      "We don send your case {caseId} to health worker. If e serious, no wait — go the nearest hospital or call 112 now.",
  },
  yoruba: {
    intro:
      "Ẹ n lẹ́ o, èmi ni Vital AI, olùrànlọ́wọ́ AI tí ń ṣe àbẹ̀wò àwọn aláìsàn lẹ́yìn tí wọ́n bá kúrò ní ilé-ìwòsàn. Èmi kì í ṣe dókítà, ṣùgbọ́n mo lè béèrè nípa ìlera yín kí n sì so yín pọ̀ mọ́ àwọn òṣìṣẹ́ ìlera yín.",
    askLanguage: "Èdè wo ni ẹ fẹ́ lò? Ẹ lè yan English, Pidgin, Yorùbá, Igbo tàbí Hausa lókè.",
    languageSet: "Ó dára — a ó máa bá a lọ ní èdè Yorùbá.",
    askFeeling: "Bawo ni ara rẹ ti n ṣe lati igba ti o ti kuro ni ile-iwosan?",
    askMedication: "Ṣé ẹ ń lo oògùn yín gẹ́gẹ́ bí àwọn òṣìṣẹ́ ìlera yín ṣe sọ?",
    askSymptoms: "Ṣé ẹ ti ṣàkíyèsí àmì àìsàn tuntun kankan, tàbí ohun kan tí ó ń burú sí i?",
    askFollowUp: "Ṣé ẹ ní ìpàdé àyẹ̀wò pẹ̀lú dókítà, àbí ẹ fẹ́ kí a ràn yín lọ́wọ́ láti ṣètò rẹ̀?",
    ackBetter: "Ẹ ṣé tí ẹ sọ fún mi. Inú mi dùn pé ara yín ti ń yá.",
    ackNotBetter: "Ẹ ṣé tí ẹ sọ fún mi. Ẹ pẹ̀lẹ́ o, ara yín kò tíì yá dáadáa.",
    ackMedsYes: "Ó dára pé ẹ ń lo oògùn yín gẹ́gẹ́ bí wọ́n ṣe sọ.",
    ackMedsNo:
      "Ẹ jọ̀wọ́, ẹ má ṣe dá oògùn yín dúró tàbí yí i padà fúnra yín — ẹ kàn sí àwọn òṣìṣẹ́ ìlera yín tàbí oníṣègùn oògùn.",
    ackNoSymptoms: "Ẹ ṣé — ó dára pé ẹ kò ṣàkíyèsí àmì tuntun kankan.",
    ackFollowUpYes: "Ẹ jọ̀wọ́ ẹ rí i dájú pé ẹ lọ sí ìpàdé àyẹ̀wò yín.",
    ackFollowUpNeed:
      "Mo ti kọ ọ́ sílẹ̀ pé ẹ nílò ìrànlọ́wọ́ fún àyẹ̀wò. Ẹnìkan láti ọ̀dọ̀ àwọn òṣìṣẹ́ ìlera yín yóò kàn sí yín.",
    complete:
      "Àyẹ̀wò yín ti parí. Ẹ máa tẹ̀lé ìtọ́sọ́nà àwọn òṣìṣẹ́ ìlera yín, kí ẹ sì sinmi dáadáa. Tí ẹ bá ṣàkíyèsí àmì tuntun tàbí tí ó ń burú sí i, ẹ lọ rí dókítà ní kíákíá.",
    urgent:
      "Èyí lè nílò ìtọ́jú pàjáwìrì. Ẹ jọ̀wọ́ ẹ wá ìtọ́jú ìlera lẹ́sẹ̀kẹsẹ̀ tàbí kí ẹ pe iṣẹ́ pàjáwìrì. Tí ẹ bá wà ní Èkó, ẹ lè pe 112 tàbí 767. Tí ó bá ṣeéṣe, ẹ jẹ́ kí ẹnìkan dúró tì yín kí ó sì ràn yín lọ́wọ́ láti rí ìtọ́jú. Mo ti fi tó òṣìṣẹ́ ìlera létí.",
    medicationSafety:
      "Mi ò lè gbà yín nímọ̀ràn láti yí iye oògùn yín padà. Ẹ jọ̀wọ́ ẹ má ṣe ṣe ìlọ́po méjì tàbí yí bí ẹ ṣe ń lo oògùn yín padà fúnra yín. Ẹ tẹ̀lé ìtọ́sọ́nà àwọn òṣìṣẹ́ ìlera yín, kí ẹ sì pe dókítà tàbí oníṣègùn oògùn yín láti béèrè ohun tí ẹ ó ṣe nípa oògùn tí ẹ gbàgbé.",
    noted: "Ẹ ṣé, mo ti kọ ọ̀rọ̀ yín sílẹ̀.",
    escalated:
      "A ti fi ọ̀rọ̀ yín ({caseId}) ránṣẹ́ sí òṣìṣẹ́ ìlera. Tí ó bá le, ẹ má ṣe dúró — ẹ lọ sí ilé-ìwòsàn tó súnmọ́ yín jù tàbí kí ẹ pe 112 báyìí.",
  },
  igbo: {
    intro:
      "Ndewo, abụ m Vital AI, onye enyemaka AI na-eleta ndị ọrịa mgbe ha hapụrụ ụlọ ọgwụ. Abụghị m dọkịta, mana enwere m ike ịjụ maka ahụ gị ma jikọọ gị na ndị ọrụ ahụike gị.",
    askLanguage:
      "Kedu asụsụ ị ga-achọ ka anyị jiri? Ị nwere ike ịhọrọ English, Pidgin, Yoruba, Igbo ma ọ bụ Hausa n'elu.",
    languageSet: "Ọ dị mma — anyị ga-aga n'ihu n'asụsụ Igbo.",
    askFeeling: "Kedu ka ahụ gị dị kemgbe ị hapụrụ ụlọ ọgwụ?",
    askMedication: "Ị na-aṅụ ọgwụ gị dịka ndị ọrụ ahụike gị si gwa gị?",
    askSymptoms: "Ị hụla ihe ịrịba ama ọhụrụ ọ bụla, ma ọ bụ ihe na-akawanye njọ?",
    askFollowUp: "Ị nwere oge nhọpụta ịhụ dọkịta ọzọ, ka ị chọrọ ka anyị nyere gị aka ịhazi ya?",
    ackBetter: "Daalụ maka ịgwa m. Obi dị m ụtọ na ahụ na-adị gị mma.",
    ackNotBetter: "Daalụ maka ịgwa m. Ndo, ahụ ka adịghị gị mma nke ọma.",
    ackMedsYes: "Ọ dị mma na ị na-aṅụ ọgwụ gị dịka e kwuru.",
    ackMedsNo:
      "Biko akwụsịla ma ọ bụ gbanwee ọgwụ gị n'onwe gị — kpọtụrụ ndị ọrụ ahụike gị ma ọ bụ onye na-ere ọgwụ.",
    ackNoSymptoms: "Daalụ — ọ dị mma na ịhụbeghị ihe ịrịba ama ọhụrụ.",
    ackFollowUpYes: "Biko gaa oge nhọpụta gị.",
    ackFollowUpNeed:
      "Edeela m na ị chọrọ enyemaka maka nleta. Onye otu ndị ọrụ ahụike gị ga-akpọtụrụ gị.",
    complete:
      "Nleta gị agwụla. Gaa n'ihu na-agbaso ntụziaka ndị ọrụ ahụike gị ma zuo ike nke ọma. Ọ bụrụ na ị hụ ihe ịrịba ama ọhụrụ ma ọ bụ ihe na-akawanye njọ, biko gaa hụ dọkịta ngwa ngwa.",
    urgent:
      "Nke a nwere ike ịchọ nlekọta ahụike ngwa ngwa. Biko chọọ nlekọta ahụike ozugbo ma ọ bụ kpọọ ọrụ mberede. Ọ bụrụ na ị nọ na Lagos, ị nwere ike ịkpọ 112 ma ọ bụ 767. Ọ bụrụ na o kwere omume, mee ka mmadụ nọnyere gị ma nyere gị aka ịnweta nlekọta. Agwala m onye ọrụ ahụike banyere nke a.",
    medicationSafety:
      "Enweghị m ike ịdụ gị ọdụ ịgbanwe ọgwụ gị. Biko emela ya okpukpu abụọ ma ọ bụ gbanwee otu i si aṅụ ọgwụ gị n'onwe gị. Soro ntụziaka ndị ọrụ ahụike gị, ma kpọọ dọkịta gị ma ọ bụ onye na-ere ọgwụ ka ha gwa gị ihe ị ga-eme maka ọgwụ ị hapụrụ.",
    noted: "Daalụ, edeela m ozi gị.",
    escalated:
      "Ezigala m okwu gị ({caseId}) nye onye ọrụ ahụike. Ọ bụrụ na ọ dị njọ, echela — gaa ụlọ ọgwụ kacha nso ma ọ bụ kpọọ 112 ugbu a.",
  },
  hausa: {
    intro:
      "Sannu, ni ne Vital AI, mataimakin AI mai bibiyar marasa lafiya bayan an sallame su daga asibiti. Ni ba likita ba ne, amma zan iya tambayar yadda jikinka yake kuma in haɗa ka da ma'aikatan lafiyarka.",
    askLanguage:
      "Wane harshe kake so mu yi amfani da shi? Za ka iya zaɓar English, Pidgin, Yoruba, Igbo ko Hausa a sama.",
    languageSet: "Madalla — za mu ci gaba da Hausa.",
    askFeeling: "Yaya kake ji tun lokacin da ka bar asibiti?",
    askMedication: "Kana shan maganinka kamar yadda ma'aikatan lafiyarka suka umarce ka?",
    askSymptoms: "Ka lura da wata sabuwar alama, ko wani abu da ke ƙara tsananta?",
    askFollowUp: "Kana da ranar komawa ganin likita, ko kana son mu taimaka maka wajen tsara shi?",
    ackBetter: "Na gode da ka sanar da ni. Na ji daɗin cewa kana samun sauƙi.",
    ackNotBetter: "Na gode da ka sanar da ni. Ayya, jikinka bai gama warwarewa ba tukuna.",
    ackMedsYes: "Yana da kyau kana shan maganinka kamar yadda aka umarta.",
    ackMedsNo:
      "Don Allah kada ka daina ko ka canza maganinka da kanka — tuntuɓi ma'aikatan lafiyarka ko mai sayar da magani.",
    ackNoSymptoms: "Na gode — yana da kyau ba ka lura da sabuwar alama ba.",
    ackFollowUpYes: "Don Allah ka tabbata ka je ranar ganin likitanka.",
    ackFollowUpNeed:
      "Na rubuta cewa kana buƙatar taimako game da bibiya. Wani daga ma'aikatan lafiyarka zai tuntuɓe ka.",
    complete:
      "Bibiyarka ta kammala. Ci gaba da bin umarnin ma'aikatan lafiyarka kuma ka huta sosai. Idan ka lura da sabuwar alama ko abin ya ƙara tsananta, ka je ganin likita da wuri.",
    urgent:
      "Wannan na iya buƙatar kulawar gaggawa. Don Allah ka nemi kulawar lafiya nan take ko ka kira sabis na gaggawa. Idan kana Lagos, za ka iya kiran 112 ko 767. Idan zai yiwu, a sa wani ya zauna tare da kai ya taimaka maka samun kulawa. Na sanar da ma'aikacin lafiya.",
    medicationSafety:
      "Ba zan iya ba ka shawarar canza yawan maganinka ba. Don Allah kada ka ninka ko ka canza yadda kake shan maganinka da kanka. Bi umarnin ma'aikatan lafiyarka, kuma ka kira likitanka ko mai sayar da magani don ka tambayi abin da za ka yi game da maganin da ka manta.",
    noted: "Na gode, na rubuta saƙonka.",
    escalated:
      "An tura batunka ({caseId}) zuwa ga ma'aikacin lafiya. Idan abin ya yi tsanani, kada ka jira — je asibiti mafi kusa ko ka kira 112 yanzu.",
  },
};

export function t(language: Language, key: MessageKey, vars: Record<string, string> = {}): string {
  let text = (MESSAGES[language] ?? MESSAGES.en)[key];
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  return text;
}
