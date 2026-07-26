import type { PreferredLanguage } from "@/lib/preferences/language-font";

export type MessageKey =
  | "nav.preferences"
  | "nav.signUp"
  | "prefs.title"
  | "prefs.subtitle"
  | "prefs.learningStyles"
  | "prefs.learningPace"
  | "prefs.preferredLanguage"
  | "prefs.fontStyle"
  | "prefs.accessibilities"
  | "prefs.style.visual"
  | "prefs.style.auditory"
  | "prefs.style.hands_on"
  | "prefs.style.reading_writing"
  | "prefs.pace.slow"
  | "prefs.pace.slowHint"
  | "prefs.pace.moderate"
  | "prefs.pace.moderateHint"
  | "prefs.pace.fast"
  | "prefs.pace.fastHint"
  | "prefs.font.standard_clean"
  | "prefs.font.standard_cleanHint"
  | "prefs.font.dyslexia_support"
  | "prefs.font.dyslexia_supportHint"
  | "prefs.font.max_legibility"
  | "prefs.font.max_legibilityHint"
  | "prefs.adhd"
  | "prefs.adhdDesc"
  | "prefs.dyscalculia"
  | "prefs.dyscalculiaDesc"
  | "prefs.mathAnxiety"
  | "prefs.mathAnxietyDesc"
  | "prefs.dyslexia"
  | "prefs.dyslexiaDesc"
  | "prefs.dysgraphia"
  | "prefs.dysgraphiaDesc"
  | "prefs.nvld"
  | "prefs.nvldDesc"
  | "prefs.apd"
  | "prefs.apdDesc"
  | "prefs.save"
  | "prefs.saving"
  | "prefs.saved"
  | "prefs.continue"
  | "dashboard.placeholder"
  | "dashboard.depth"
  | "dashboard.start"
  | "dashboard.starting"
  | "dashboard.chooseDepth"
  | "dashboard.depth.quick_answer"
  | "dashboard.depth.quick_answerHint"
  | "dashboard.depth.overview"
  | "dashboard.depth.overviewHint"
  | "dashboard.depth.deep_dive"
  | "dashboard.depth.deep_diveHint"
  | "dashboard.depth.complete_mastery"
  | "dashboard.depth.complete_masteryHint"
  | "common.loading"
  | "common.error"
  | "lesson.complete"
  | "lesson.next"
  | "lesson.blocked"
  | "lesson.retry";

type Catalog = Record<MessageKey, string>;

const en: Catalog = {
  "nav.preferences": "Preferences",
  "nav.signUp": "Sign Up",
  "prefs.title": "Tune your learning experience",
  "prefs.subtitle":
    "These shape every new course and lesson — slide length, lesson formats (quiz vs slides vs script), tone, and accessibilities. The app also learns from how you use it and refines later lessons (no extra AI cost for that).",
  "prefs.learningStyles": "Learning styles",
  "prefs.learningPace": "Learning pace",
  "prefs.preferredLanguage": "Preferred language",
  "prefs.fontStyle": "Font style",
  "prefs.accessibilities": "Accessibilities",
  "prefs.style.visual": "Visual",
  "prefs.style.auditory": "Auditory",
  "prefs.style.hands_on": "Hands-on",
  "prefs.style.reading_writing": "Reading / writing",
  "prefs.pace.slow": "Slow & steady",
  "prefs.pace.slowHint": "More slides, gentler progression.",
  "prefs.pace.moderate": "Moderate",
  "prefs.pace.moderateHint": "Balanced pacing for most topics.",
  "prefs.pace.fast": "Fast",
  "prefs.pace.fastHint": "Denser lessons, fewer pauses.",
  "prefs.font.standard_clean": "Standard Clean",
  "prefs.font.standard_cleanHint": "Inter — clear, modern UI type.",
  "prefs.font.dyslexia_support": "Dyslexia Support",
  "prefs.font.dyslexia_supportHint":
    "OpenDyslexic — heavier bottoms, clearer letter shapes.",
  "prefs.font.max_legibility": "Max Legibility",
  "prefs.font.max_legibilityHint":
    "Atkinson Hyperlegible — high distinguishability.",
  "prefs.adhd": "ADHD micro-learning mode",
  "prefs.adhdDesc": "Shorter slides, fewer distractions, break prompts.",
  "prefs.dyscalculia": "Dyscalculia supports",
  "prefs.dyscalculiaDesc":
    "Visual math aids, step-by-step breakdowns, color-coded numbers.",
  "prefs.mathAnxiety": "Math anxiety supports",
  "prefs.mathAnxietyDesc":
    "Gentle progression, no timers, encouraging hints.",
  "prefs.dyslexia": "Dyslexia supports",
  "prefs.dyslexiaDesc":
    "Simplified language, spaced layout, phonetic supports.",
  "prefs.dysgraphia": "Dysgraphia supports",
  "prefs.dysgraphiaDesc":
    "Less writing load; prefer selection and matching tasks.",
  "prefs.nvld": "Nonverbal Learning Disability (NVLD)",
  "prefs.nvldDesc":
    "Explicit verbal steps; less figurative or diagram-only teaching.",
  "prefs.apd": "Auditory Processing Disorder (APD)",
  "prefs.apdDesc":
    "Full on-screen text; slow, clear narration that matches the slides.",
  "prefs.save": "Save preferences",
  "prefs.saving": "Saving…",
  "prefs.saved": "Saved",
  "prefs.continue": "Save & continue",
  "dashboard.placeholder": "What do you want to learn?",
  "dashboard.depth": "Depth",
  "dashboard.start": "Start learning",
  "dashboard.starting": "Starting…",
  "dashboard.chooseDepth": "Choose a depth before starting.",
  "dashboard.depth.quick_answer": "Quick answer",
  "dashboard.depth.quick_answerHint": "One focused lesson, right now.",
  "dashboard.depth.overview": "Overview",
  "dashboard.depth.overviewHint": "A short guided tour — a few lessons.",
  "dashboard.depth.deep_dive": "Deep dive",
  "dashboard.depth.deep_diveHint": "A proper multi-module course.",
  "dashboard.depth.complete_mastery": "Complete mastery",
  "dashboard.depth.complete_masteryHint":
    "The full curriculum — as many modules as the topic really needs.",
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "lesson.complete": "Mark complete",
  "lesson.next": "Next lesson",
  "lesson.blocked": "This lesson could not be generated.",
  "lesson.retry": "Try again",
};

const es: Catalog = {
  ...en,
  "nav.preferences": "Preferencias",
  "nav.signUp": "Registrarse",
  "prefs.title": "Ajusta tu experiencia de aprendizaje",
  "prefs.subtitle":
    "Esto da forma a cada curso y lección nueva: duración de diapositivas, formatos, tono y accesibilidades. La app también aprende de cómo la usas.",
  "prefs.learningStyles": "Estilos de aprendizaje",
  "prefs.learningPace": "Ritmo de aprendizaje",
  "prefs.preferredLanguage": "Idioma preferido",
  "prefs.fontStyle": "Estilo de fuente",
  "prefs.accessibilities": "Accesibilidades",
  "prefs.style.visual": "Visual",
  "prefs.style.auditory": "Auditivo",
  "prefs.style.hands_on": "Práctico",
  "prefs.style.reading_writing": "Lectura / escritura",
  "prefs.pace.slow": "Lento y constante",
  "prefs.pace.slowHint": "Más diapositivas, progresión más suave.",
  "prefs.pace.moderate": "Moderado",
  "prefs.pace.moderateHint": "Ritmo equilibrado para la mayoría de temas.",
  "prefs.pace.fast": "Rápido",
  "prefs.pace.fastHint": "Lecciones más densas, menos pausas.",
  "prefs.save": "Guardar preferencias",
  "prefs.saving": "Guardando…",
  "prefs.saved": "Guardado",
  "prefs.continue": "Guardar y continuar",
  "dashboard.placeholder": "¿Qué quieres aprender?",
  "dashboard.depth": "Profundidad",
  "dashboard.start": "Empezar a aprender",
  "dashboard.starting": "Empezando…",
  "dashboard.chooseDepth": "Elige una profundidad antes de empezar.",
  "dashboard.depth.quick_answer": "Respuesta rápida",
  "dashboard.depth.quick_answerHint": "Una lección enfocada, ahora.",
  "dashboard.depth.overview": "Resumen",
  "dashboard.depth.overviewHint": "Un recorrido breve — unas pocas lecciones.",
  "dashboard.depth.deep_dive": "Inmersión",
  "dashboard.depth.deep_diveHint": "Un curso multi-módulo completo.",
  "dashboard.depth.complete_mastery": "Dominio completo",
  "dashboard.depth.complete_masteryHint":
    "El currículo completo — tantos módulos como el tema necesite.",
  "common.loading": "Cargando…",
  "common.error": "Algo salió mal.",
  "lesson.complete": "Marcar como completa",
  "lesson.next": "Siguiente lección",
  "lesson.blocked": "No se pudo generar esta lección.",
  "lesson.retry": "Reintentar",
  "prefs.adhd": "Modo microaprendizaje TDAH",
  "prefs.adhdDesc": "Diapositivas más cortas, menos distracciones.",
  "prefs.dyscalculia": "Apoyos para discalculia",
  "prefs.dyscalculiaDesc": "Ayudas visuales y desgloses paso a paso.",
  "prefs.mathAnxiety": "Apoyos para ansiedad matemática",
  "prefs.mathAnxietyDesc": "Progresión suave, sin temporizadores.",
  "prefs.dyslexia": "Apoyos para dislexia",
  "prefs.dyslexiaDesc": "Lenguaje más simple y diseño espaciado.",
  "prefs.dysgraphia": "Apoyos para disgrafía",
  "prefs.dysgraphiaDesc": "Menos escritura; preferir selección.",
  "prefs.nvld": "Trastorno del aprendizaje no verbal (NVLD)",
  "prefs.nvldDesc": "Pasos verbales explícitos; menos metáforas.",
  "prefs.apd": "Trastorno del procesamiento auditivo (APD)",
  "prefs.apdDesc": "Texto completo en pantalla; narración clara.",
};

const zh: Catalog = {
  ...en,
  "nav.preferences": "偏好设置",
  "nav.signUp": "注册",
  "prefs.title": "调整你的学习体验",
  "prefs.subtitle":
    "这些设置会影响每门新课程与每节课：幻灯片长度、课程格式、语气与无访问性。应用也会根据你的使用情况改进后续课程。",
  "prefs.learningStyles": "学习风格",
  "prefs.learningPace": "学习节奏",
  "prefs.preferredLanguage": "首选语言",
  "prefs.fontStyle": "字体样式",
  "prefs.accessibilities": "无障碍",
  "prefs.style.visual": "视觉",
  "prefs.style.auditory": "听觉",
  "prefs.style.hands_on": "动手",
  "prefs.style.reading_writing": "读写",
  "prefs.pace.slow": "慢而稳",
  "prefs.pace.slowHint": "更多幻灯片，更缓和的推进。",
  "prefs.pace.moderate": "适中",
  "prefs.pace.moderateHint": "适合大多数主题的平衡节奏。",
  "prefs.pace.fast": "快",
  "prefs.pace.fastHint": "内容更密，停顿更少。",
  "prefs.save": "保存偏好",
  "prefs.saving": "保存中…",
  "prefs.saved": "已保存",
  "prefs.continue": "保存并继续",
  "dashboard.placeholder": "你想学什么？",
  "dashboard.depth": "深度",
  "dashboard.start": "开始学习",
  "dashboard.starting": "正在开始…",
  "dashboard.chooseDepth": "开始前请选择深度。",
  "dashboard.depth.quick_answer": "快速解答",
  "dashboard.depth.quick_answerHint": "一节聚焦的课，马上开始。",
  "dashboard.depth.overview": "概览",
  "dashboard.depth.overviewHint": "简短导览——几节课。",
  "dashboard.depth.deep_dive": "深入学习",
  "dashboard.depth.deep_diveHint": "完整的多模块课程。",
  "dashboard.depth.complete_mastery": "完全掌握",
  "dashboard.depth.complete_masteryHint": "完整课程——主题真正需要的全部模块。",
  "common.loading": "加载中…",
  "common.error": "出了点问题。",
  "lesson.complete": "标记完成",
  "lesson.next": "下一课",
  "lesson.blocked": "无法生成本课。",
  "lesson.retry": "重试",
  "prefs.adhd": "ADHD 微学习模式",
  "prefs.adhdDesc": "更短幻灯片、更少干扰、休息提示。",
  "prefs.dyscalculia": "计算障碍支持",
  "prefs.dyscalculiaDesc": "可视化数学辅助与分步拆解。",
  "prefs.mathAnxiety": "数学焦虑支持",
  "prefs.mathAnxietyDesc": "温和推进，无计时器。",
  "prefs.dyslexia": "阅读障碍支持",
  "prefs.dyslexiaDesc": "简化语言与更宽松排版。",
  "prefs.dysgraphia": "书写障碍支持",
  "prefs.dysgraphiaDesc": "减少书写负担；偏好选择题。",
  "prefs.nvld": "非语言学习障碍 (NVLD)",
  "prefs.nvldDesc": "明确的口头步骤；减少比喻。",
  "prefs.apd": "听觉处理障碍 (APD)",
  "prefs.apdDesc": "完整屏幕文字；清晰慢速旁白。",
};

const hi: Catalog = {
  ...en,
  "nav.preferences": "प्राथमिकताएँ",
  "nav.signUp": "साइन अप",
  "prefs.title": "अपने सीखने के अनुभव को समायोजित करें",
  "prefs.subtitle":
    "ये हर नए कोर्स और पाठ को आकार देते हैं — स्लाइड लंबाई, प्रारूप, स्वर और पहुँच। ऐप आपके उपयोग से भी सीखती है।",
  "prefs.learningStyles": "सीखने की शैलियाँ",
  "prefs.learningPace": "सीखने की गति",
  "prefs.preferredLanguage": "पसंदीदा भाषा",
  "prefs.fontStyle": "फ़ॉन्ट शैली",
  "prefs.accessibilities": "पहुँच क्षमताएँ",
  "prefs.style.visual": "दृश्य",
  "prefs.style.auditory": "श्रवण",
  "prefs.style.hands_on": "व्यावहारिक",
  "prefs.style.reading_writing": "पढ़ना / लिखना",
  "prefs.pace.slow": "धीमा और स्थिर",
  "prefs.pace.slowHint": "अधिक स्लाइड, नरम प्रगति।",
  "prefs.pace.moderate": "मध्यम",
  "prefs.pace.moderateHint": "अधिकांश विषयों के लिए संतुलित गति।",
  "prefs.pace.fast": "तेज़",
  "prefs.pace.fastHint": "घने पाठ, कम ठहराव।",
  "prefs.save": "प्राथमिकताएँ सहेजें",
  "prefs.saving": "सहेजा जा रहा है…",
  "prefs.saved": "सहेजा गया",
  "prefs.continue": "सहेजें और जारी रखें",
  "dashboard.placeholder": "आप क्या सीखना चाहते हैं?",
  "dashboard.depth": "गहराई",
  "dashboard.start": "सीखना शुरू करें",
  "dashboard.starting": "शुरू हो रहा है…",
  "dashboard.chooseDepth": "शुरू करने से पहले गहराई चुनें।",
  "dashboard.depth.quick_answer": "त्वरित उत्तर",
  "dashboard.depth.quick_answerHint": "एक केंद्रित पाठ, अभी।",
  "dashboard.depth.overview": "अवलोकन",
  "dashboard.depth.overviewHint": "संक्षिप्त मार्गदर्शन — कुछ पाठ।",
  "dashboard.depth.deep_dive": "गहन अध्ययन",
  "dashboard.depth.deep_diveHint": "उचित बहु-मॉड्यूल कोर्स।",
  "dashboard.depth.complete_mastery": "पूर्ण महारत",
  "dashboard.depth.complete_masteryHint":
    "पूरा पाठ्यक्रम — जितने मॉड्यूल विषय को चाहिए।",
  "common.loading": "लोड हो रहा है…",
  "common.error": "कुछ गलत हुआ।",
  "lesson.complete": "पूर्ण चिह्नित करें",
  "lesson.next": "अगला पाठ",
  "lesson.blocked": "यह पाठ उत्पन्न नहीं हो सका।",
  "lesson.retry": "फिर कोशिश करें",
};

const ar: Catalog = {
  ...en,
  "nav.preferences": "التفضيلات",
  "nav.signUp": "إنشاء حساب",
  "prefs.title": "اضبط تجربة تعلّمك",
  "prefs.subtitle":
    "تشكّل هذه الإعدادات كل دورة ودرس جديد — طول الشرائح والصيغ والنبرة وإمكانات الوصول. يتعلّم التطبيق أيضًا من استخدامك.",
  "prefs.learningStyles": "أساليب التعلّم",
  "prefs.learningPace": "وتيرة التعلّم",
  "prefs.preferredLanguage": "اللغة المفضلة",
  "prefs.fontStyle": "نمط الخط",
  "prefs.accessibilities": "إمكانية الوصول",
  "prefs.style.visual": "بصري",
  "prefs.style.auditory": "سمعي",
  "prefs.style.hands_on": "عملي",
  "prefs.style.reading_writing": "قراءة / كتابة",
  "prefs.pace.slow": "بطيء وثابت",
  "prefs.pace.slowHint": "مزيد من الشرائح وتقدّم ألطف.",
  "prefs.pace.moderate": "معتدل",
  "prefs.pace.moderateHint": "وتيرة متوازنة لمعظم المواضيع.",
  "prefs.pace.fast": "سريع",
  "prefs.pace.fastHint": "دروس أكثر كثافة وتوقفات أقل.",
  "prefs.save": "حفظ التفضيلات",
  "prefs.saving": "جارٍ الحفظ…",
  "prefs.saved": "تم الحفظ",
  "prefs.continue": "حفظ ومتابعة",
  "dashboard.placeholder": "ماذا تريد أن تتعلّم؟",
  "dashboard.depth": "العمق",
  "dashboard.start": "ابدأ التعلّم",
  "dashboard.starting": "جارٍ البدء…",
  "dashboard.chooseDepth": "اختر عمقًا قبل البدء.",
  "dashboard.depth.quick_answer": "إجابة سريعة",
  "dashboard.depth.quick_answerHint": "درس مركّز واحد الآن.",
  "dashboard.depth.overview": "نظرة عامة",
  "dashboard.depth.overviewHint": "جولة قصيرة — بضعة دروس.",
  "dashboard.depth.deep_dive": "تعمّق",
  "dashboard.depth.deep_diveHint": "دورة متعددة الوحدات.",
  "dashboard.depth.complete_mastery": "إتقان كامل",
  "dashboard.depth.complete_masteryHint":
    "المنهج الكامل — كل الوحدات التي يحتاجها الموضوع.",
  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ ما.",
  "lesson.complete": "تعليم كمكتمل",
  "lesson.next": "الدرس التالي",
  "lesson.blocked": "تعذّر إنشاء هذا الدرس.",
  "lesson.retry": "حاول مجددًا",
  "prefs.adhd": "وضع التعلّم المصغّر لاضطراب فرط الحركة",
  "prefs.adhdDesc": "شرائح أقصر وتشتيت أقل.",
  "prefs.dyscalculia": "دعم عسر الحساب",
  "prefs.dyscalculiaDesc": "مساعدات بصرية وتفكيك خطوة بخطوة.",
  "prefs.mathAnxiety": "دعم قلق الرياضيات",
  "prefs.mathAnxietyDesc": "تقدّم لطيف بلا مؤقتات.",
  "prefs.dyslexia": "دعم عسر القراءة",
  "prefs.dyslexiaDesc": "لغة مبسّطة وتخطيط متباعد.",
  "prefs.dysgraphia": "دعم عسر الكتابة",
  "prefs.dysgraphiaDesc": "كتابة أقل؛ تفضيل الاختيار.",
  "prefs.nvld": "صعوبات التعلّم غير اللفظية",
  "prefs.nvldDesc": "خطوات لفظية صريحة؛ أقل مجازًا.",
  "prefs.apd": "اضطراب المعالجة السمعية",
  "prefs.apdDesc": "نص كامل على الشاشة؛ سرد واضح وبطيء.",
};

const fr: Catalog = {
  ...en,
  "nav.preferences": "Préférences",
  "nav.signUp": "S'inscrire",
  "prefs.title": "Ajustez votre expérience d'apprentissage",
  "prefs.subtitle":
    "Ces choix façonnent chaque nouveau cours et chaque leçon — durée des diapositives, formats, ton et accessibilités. L'app apprend aussi de votre usage.",
  "prefs.learningStyles": "Styles d'apprentissage",
  "prefs.learningPace": "Rythme d'apprentissage",
  "prefs.preferredLanguage": "Langue préférée",
  "prefs.fontStyle": "Style de police",
  "prefs.accessibilities": "Accessibilités",
  "prefs.style.visual": "Visuel",
  "prefs.style.auditory": "Auditif",
  "prefs.style.hands_on": "Pratique",
  "prefs.style.reading_writing": "Lecture / écriture",
  "prefs.pace.slow": "Lent et régulier",
  "prefs.pace.slowHint": "Plus de diapositives, progression douce.",
  "prefs.pace.moderate": "Modéré",
  "prefs.pace.moderateHint": "Rythme équilibré pour la plupart des sujets.",
  "prefs.pace.fast": "Rapide",
  "prefs.pace.fastHint": "Leçons plus denses, moins de pauses.",
  "prefs.save": "Enregistrer les préférences",
  "prefs.saving": "Enregistrement…",
  "prefs.saved": "Enregistré",
  "prefs.continue": "Enregistrer et continuer",
  "dashboard.placeholder": "Que voulez-vous apprendre ?",
  "dashboard.depth": "Profondeur",
  "dashboard.start": "Commencer à apprendre",
  "dashboard.starting": "Démarrage…",
  "dashboard.chooseDepth": "Choisissez une profondeur avant de commencer.",
  "dashboard.depth.quick_answer": "Réponse rapide",
  "dashboard.depth.quick_answerHint": "Une leçon ciblée, tout de suite.",
  "dashboard.depth.overview": "Aperçu",
  "dashboard.depth.overviewHint": "Une courte visite — quelques leçons.",
  "dashboard.depth.deep_dive": "Approfondissement",
  "dashboard.depth.deep_diveHint": "Un vrai cours multi-modules.",
  "dashboard.depth.complete_mastery": "Maîtrise complète",
  "dashboard.depth.complete_masteryHint":
    "Le programme complet — autant de modules que le sujet l'exige.",
  "common.loading": "Chargement…",
  "common.error": "Une erreur s'est produite.",
  "lesson.complete": "Marquer comme terminé",
  "lesson.next": "Leçon suivante",
  "lesson.blocked": "Cette leçon n'a pas pu être générée.",
  "lesson.retry": "Réessayer",
};

const pt: Catalog = {
  ...en,
  "nav.preferences": "Preferências",
  "nav.signUp": "Criar conta",
  "prefs.title": "Ajuste sua experiência de aprendizagem",
  "prefs.subtitle":
    "Isso molda cada novo curso e lição — duração dos slides, formatos, tom e acessibilidades. O app também aprende com o seu uso.",
  "prefs.learningStyles": "Estilos de aprendizagem",
  "prefs.learningPace": "Ritmo de aprendizagem",
  "prefs.preferredLanguage": "Idioma preferido",
  "prefs.fontStyle": "Estilo de fonte",
  "prefs.accessibilities": "Acessibilidades",
  "prefs.style.visual": "Visual",
  "prefs.style.auditory": "Auditivo",
  "prefs.style.hands_on": "Prático",
  "prefs.style.reading_writing": "Leitura / escrita",
  "prefs.pace.slow": "Lento e constante",
  "prefs.pace.slowHint": "Mais slides, progressão mais suave.",
  "prefs.pace.moderate": "Moderado",
  "prefs.pace.moderateHint": "Ritmo equilibrado para a maioria dos temas.",
  "prefs.pace.fast": "Rápido",
  "prefs.pace.fastHint": "Lições mais densas, menos pausas.",
  "prefs.save": "Salvar preferências",
  "prefs.saving": "Salvando…",
  "prefs.saved": "Salvo",
  "prefs.continue": "Salvar e continuar",
  "dashboard.placeholder": "O que você quer aprender?",
  "dashboard.depth": "Profundidade",
  "dashboard.start": "Começar a aprender",
  "dashboard.starting": "Iniciando…",
  "dashboard.chooseDepth": "Escolha uma profundidade antes de começar.",
  "dashboard.depth.quick_answer": "Resposta rápida",
  "dashboard.depth.quick_answerHint": "Uma lição focada, agora.",
  "dashboard.depth.overview": "Visão geral",
  "dashboard.depth.overviewHint": "Um tour curto — algumas lições.",
  "dashboard.depth.deep_dive": "Mergulho profundo",
  "dashboard.depth.deep_diveHint": "Um curso multi-módulo completo.",
  "dashboard.depth.complete_mastery": "Domínio completo",
  "dashboard.depth.complete_masteryHint":
    "O currículo completo — quantos módulos o tema precisar.",
  "common.loading": "Carregando…",
  "common.error": "Algo deu errado.",
  "lesson.complete": "Marcar como concluída",
  "lesson.next": "Próxima lição",
  "lesson.blocked": "Não foi possível gerar esta lição.",
  "lesson.retry": "Tentar de novo",
};

const de: Catalog = {
  ...en,
  "nav.preferences": "Einstellungen",
  "nav.signUp": "Registrieren",
  "prefs.title": "Passe dein Lernerlebnis an",
  "prefs.subtitle":
    "Das formt jeden neuen Kurs und jede Lektion — Folienlänge, Formate, Ton und Barrierefreiheit. Die App lernt auch aus deiner Nutzung.",
  "prefs.learningStyles": "Lernstile",
  "prefs.learningPace": "Lerntempo",
  "prefs.preferredLanguage": "Bevorzugte Sprache",
  "prefs.fontStyle": "Schriftstil",
  "prefs.accessibilities": "Barrierefreiheit",
  "prefs.style.visual": "Visuell",
  "prefs.style.auditory": "Auditiv",
  "prefs.style.hands_on": "Praktisch",
  "prefs.style.reading_writing": "Lesen / Schreiben",
  "prefs.pace.slow": "Langsam & stetig",
  "prefs.pace.slowHint": "Mehr Folien, sanfterer Fortschritt.",
  "prefs.pace.moderate": "Mittel",
  "prefs.pace.moderateHint": "Ausgewogenes Tempo für die meisten Themen.",
  "prefs.pace.fast": "Schnell",
  "prefs.pace.fastHint": "Dichtere Lektionen, weniger Pausen.",
  "prefs.save": "Einstellungen speichern",
  "prefs.saving": "Speichern…",
  "prefs.saved": "Gespeichert",
  "prefs.continue": "Speichern & weiter",
  "dashboard.placeholder": "Was möchtest du lernen?",
  "dashboard.depth": "Tiefe",
  "dashboard.start": "Lernen starten",
  "dashboard.starting": "Startet…",
  "dashboard.chooseDepth": "Wähle vor dem Start eine Tiefe.",
  "dashboard.depth.quick_answer": "Schnelle Antwort",
  "dashboard.depth.quick_answerHint": "Eine fokussierte Lektion, jetzt.",
  "dashboard.depth.overview": "Überblick",
  "dashboard.depth.overviewHint": "Eine kurze Tour — ein paar Lektionen.",
  "dashboard.depth.deep_dive": "Tiefenstudie",
  "dashboard.depth.deep_diveHint": "Ein richtiger Multi-Modul-Kurs.",
  "dashboard.depth.complete_mastery": "Vollständige Meisterschaft",
  "dashboard.depth.complete_masteryHint":
    "Das volle Curriculum — so viele Module wie das Thema braucht.",
  "common.loading": "Laden…",
  "common.error": "Etwas ist schiefgelaufen.",
  "lesson.complete": "Als erledigt markieren",
  "lesson.next": "Nächste Lektion",
  "lesson.blocked": "Diese Lektion konnte nicht erzeugt werden.",
  "lesson.retry": "Erneut versuchen",
};

const catalogs: Record<PreferredLanguage, Catalog> = {
  en,
  es,
  zh,
  hi,
  ar,
  fr,
  pt,
  de,
};

export function translate(
  locale: PreferredLanguage,
  key: MessageKey,
): string {
  return catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
}
