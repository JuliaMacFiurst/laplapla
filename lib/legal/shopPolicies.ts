import type { Lang } from "@/i18n";

export type ShopPolicyKind = "sale" | "refund" | "printable";
export const shopPolicyPaths: Record<ShopPolicyKind, string> = {
  sale: "/terms-of-sale",
  refund: "/refund-policy",
  printable: "/printable-license",
};
type Section = { heading: string; paragraphs: string[] };
type Policy = { title: string; intro: string; sections: Section[] };

export const shopPolicyCopy: Record<Lang, Record<ShopPolicyKind, Policy>> = {
  ru: {
    sale: {
      title: "Условия продажи цифровых продуктов",
      intro: "Эти условия относятся к платным цифровым продуктам LapLapLa. Описание конкретного продукта, его цена и доступность указаны на его странице и перед оплатой.",
      sections: [
        { heading: "Продавец", paragraphs: ["Продавец — израильский проект «אומנצ׳קים» (LapLapLa), зарегистрированный как עוסק פטור, регистрационный номер 337738868. По вопросам покупки можно обратиться через страницу поддержки или по адресу omanchikim@gmail.com."] },
        { heading: "Что вы приобретаете", paragraphs: ["Оплата предоставляет доступ к указанному цифровому продукту и ограниченное право его использования согласно применимой лицензии. Авторские права и право перепродажи не переходят покупателю. Объём продукта определяется описанием на странице покупки; разные продукты могут иметь разные форматы.", "Sound Case #001 — интерактивное приключение с персонализацией и материалами для самостоятельной печати через браузер. Физический комплект не доставляется; готовый полный PDF для свободного распространения не предоставляется."] },
        { heading: "Оплата и доступ", paragraphs: ["Перед подтверждением платежа показывается итоговая цена. Оплата обрабатывается PayPal; доступ связывается с аккаунтом покупателя после подтверждения платежа. Подтверждение оплаты, предоставление доступа и фактическое использование продукта — разные события. Если доступ не появился, обратитесь в поддержку и не оплачивайте повторно до проверки заказа."] },
        { heading: "Технические условия", paragraphs: ["Для доступа нужны аккаунт LapLapLa, поддерживаемый современный браузер и подключение к интернету. Для печати Sound Case #001 покупатель использует собственный принтер или функцию печати браузера; расходы на бумагу и печать не включены. Некоторые интерактивные задания открываются по QR-кодам на напечатанных материалах."] },
        { heading: "Использование и поддержка", paragraphs: ["Для печатных материалов действует отдельная лицензия. По вопросам оплаты, доступа, технических проблем, лицензии или отмены покупки используйте страницу поддержки либо пишите на omanchikim@gmail.com. Обращение рассматривается по обстоятельствам; отправка формы сама по себе не отменяет заказ и не означает автоматическое одобрение возврата."] },
        { heading: "Права покупателя", paragraphs: ["Ни эти условия, ни описание продукта не ограничивают обязательные права потребителя по применимому законодательству. При международной продаже также сохраняются обязательные права, применимые к покупателю в его стране."] },
      ],
    },
    refund: {
      title: "Возвраты и отмена покупки",
      intro: "Обращения рассматриваются с учётом типа продукта, факта предоставления доступа, обстоятельств покупки и обязательных прав покупателя.",
      sections: [
        { heading: "Оплата, доступ и использование", paragraphs: ["Подтверждение оплаты не тождественно предоставлению доступа; предоставление доступа не тождественно фактическому использованию. Мы проверяем эти обстоятельства отдельно при рассмотрении обращения."] },
        { heading: "Изменение решения", paragraphs: ["После предоставления доступа к цифровому продукту добровольный возврат из-за изменения решения, неиспользования или субъективного недовольства обычно не предоставляется в тех случаях, когда это допускает применимое законодательство. Если закон предусматривает право на отмену или иное средство защиты, оно сохраняется. Возможность применения исключения для цифровой информации к конкретному продукту оценивается по закону, а не предполагается автоматически."] },
        { heading: "Проблемы с покупкой", paragraphs: ["Обратитесь к нам, если доступ не предоставлен, обнаружена существенная техническая неисправность или существенное несоответствие описанию, произошёл ошибочный платёж либо имеется другое предусмотренное законом основание. Мы проверим заказ и предложим применимое решение, включая исправление проблемы или возврат, если он положен по закону."] },
        { heading: "Как обратиться", paragraphs: ["Укажите email аккаунта, номер заказа при наличии и описание ситуации через страницу поддержки или по адресу omanchikim@gmail.com. Эти способы не ограничивают другие предусмотренные законом способы сообщить об отмене сделки. Не присылайте данные карты или пароль. Отправка обращения не отменяет заказ автоматически."] },
        { heading: "Рассмотрение и возврат средств", paragraphs: ["Мы подтвердим получение обращения и рассмотрим его по применимому закону. При одобренном возврате сумма и способ возврата зависят от обстоятельств и исходного платежа; корректирующие бухгалтерские документы оформляются отдельно. Исходная квитанция не изменяется. Мы не обещаем автоматического возврата без рассмотрения."] },
        { heading: "Обязательные права", paragraphs: ["Эта политика не отменяет обязательные права покупателя в Израиле или другой применимой юрисдикции, в том числе при непредоставлении доступа, существенном дефекте или несоответствии и ошибочном платеже."] },
      ],
    },
    printable: {
      title: "Лицензия на цифровые материалы для печати",
      intro: "Эта лицензия применяется только к приобретённым продуктам, в описании которых предусмотрена самостоятельная печать. Для других форматов действуют их собственные условия.",
      sections: [
        { heading: "Предоставляемое право", paragraphs: ["Покупатель получает ограниченное, неисключительное право использовать приобретённый продукт для личной и семейной игры. Можно пригласить участников и провести приобретённую игру вместе с ними. Право доступа и авторские права остаются у правообладателя."] },
        { heading: "Персонализация и печать", paragraphs: ["Можно персонализировать материалы предусмотренными инструментами, печатать их для своей разрешённой игры и повторно печатать для собственного разрешённого использования. Лимит числа семейных игр или повторных распечаток этой лицензией не установлен. Если браузер предлагает «Сохранить как PDF», такой файл подчиняется тем же ограничениям использования."] },
        { heading: "Что запрещено без отдельного разрешения", paragraphs: ["Нельзя перепродавать продукт, передавать доступ к аккаунту или цифровые копии для чужих самостоятельных игр, публиковать материалы, размещать их на торговых площадках, продавать распечатанные комплекты, выдавать произведение за своё либо удалять обозначения авторских прав. Право на совместную игру не даёт права распространять копии."] },
        { heading: "Группы и образование", paragraphs: ["Игра с приглашённой группой разрешена в рамках этой лицензии. Отдельные варианты для класса или образовательного учреждения пока не продаются; условия передачи материалов между классами и преподавателями требуют отдельного согласования с LapLapLa. Эта страница не устанавливает новый тариф или число участников."] },
        { heading: "Связь с нами и закон", paragraphs: ["Если нужен иной формат использования, обратитесь через страницу поддержки или по адресу omanchikim@gmail.com. Эта лицензия не ограничивает права, которые нельзя исключить по применимому законодательству."] },
      ],
    },
  },
  en: {
    sale: {
      title: "Terms of Sale for Digital Products",
      intro: "These terms cover paid LapLapLa digital products. Each product page and checkout show its description, price and availability.",
      sections: [
        { heading: "Seller", paragraphs: ["The seller is the Israeli project אומנצ׳קים (LapLapLa), registered as an עוסק פטור, registration number 337738868. For purchase questions, use the support page or email omanchikim@gmail.com."] },
        { heading: "What you buy", paragraphs: ["Payment gives you access to the specified digital product and a limited right to use it under the applicable license. Copyright and resale rights do not transfer to you. The product page defines what is included; other products may use different formats.", "Sound Case #001 is an interactive adventure with personalization and materials you print yourself through your browser. No physical kit is shipped, and no complete ready-made PDF is supplied for unrestricted distribution."] },
        { heading: "Payment and access", paragraphs: ["The final price is shown before payment confirmation. PayPal processes payment; access is linked to your account after payment is confirmed. Payment confirmation, provision of access and actual use are distinct events. If access does not appear, contact support and avoid paying again while the order is checked."] },
        { heading: "Technical requirements", paragraphs: ["Access requires a LapLapLa account, a supported modern browser and an internet connection. To print Sound Case #001, use your own printer or the browser print function; paper and printing costs are not included. Some interactive activities open through QR codes on the printed materials."] },
        { heading: "Use and support", paragraphs: ["The separate printable materials license applies where relevant. For payment, access, technical, licensing or cancellation questions, use the support page or email omanchikim@gmail.com. Requests are reviewed on their facts; submitting the form does not itself cancel an order or automatically approve a refund."] },
        { heading: "Consumer rights", paragraphs: ["These terms and product descriptions do not limit mandatory consumer rights under applicable law. Mandatory protections applicable to buyers in other countries also remain in effect."] },
      ],
    },
    refund: {
      title: "Refund and Cancellation Policy",
      intro: "We review requests in light of the product type, whether access was provided, the circumstances of the purchase and your mandatory rights.",
      sections: [
        { heading: "Payment, access and use", paragraphs: ["Payment confirmation is not the same as providing access, and providing access is not the same as actual use. We consider these separately when reviewing a request."] },
        { heading: "Change of mind", paragraphs: ["After access to a digital product is provided, discretionary refunds for a change of mind, non-use or subjective dissatisfaction are generally not offered where applicable law permits this. Any statutory cancellation right or other remedy remains available. Whether an exception for digital information applies to a particular product must be assessed under the law; it is not assumed automatically."] },
        { heading: "Problems with a purchase", paragraphs: ["Contact us if access was not provided, there is a substantial technical defect or material mismatch with the description, a payment was made in error, or another legal ground applies. We will check the order and offer the remedy required by applicable law, including correction or a refund where due."] },
        { heading: "How to contact us", paragraphs: ["Use the support page or email omanchikim@gmail.com with your account email, order number if available and a description of the problem. These channels do not restrict other legally available ways to give cancellation notice. Do not send card details or passwords. A request does not automatically cancel an order."] },
        { heading: "Review and reimbursement", paragraphs: ["We acknowledge and assess requests under applicable law. For an approved refund, the amount and method depend on the circumstances and original payment; corrective accounting documents are issued separately. The original receipt is not changed. Refunds are not automatic."] },
        { heading: "Mandatory rights", paragraphs: ["This policy does not waive mandatory rights in Israel or another applicable jurisdiction, including rights concerning failure to provide access, a substantial defect or mismatch, or an erroneous payment."] },
      ],
    },
    printable: {
      title: "Printable Digital Materials License",
      intro: "This license applies only to purchased products whose description includes self-printing. Other formats may have their own terms.",
      sections: [
        { heading: "Your permission to use", paragraphs: ["You receive a limited, non-exclusive right to use the purchased product for personal and family play. You may invite a group to play the purchased game together. Access rights and copyright remain with their respective owners."] },
        { heading: "Personalization and printing", paragraphs: ["You may personalize materials with the provided tools, print them for your permitted game and reprint them for your own permitted use. This license sets no numerical limit on family play or reprints. If your browser offers Save as PDF, the saved file remains subject to the same use limits."] },
        { heading: "What requires separate permission", paragraphs: ["Do not resell the product, share account access or digital copies for other people to run separate games, publish the materials, upload them to marketplaces, sell printed kits, claim the work as your own or remove copyright notices. Group play does not permit redistribution of copies."] },
        { heading: "Groups and education", paragraphs: ["Playing with an invited group is permitted under this license. Separate classroom or institution licenses are not currently offered; sharing materials across classes or educators requires an individual arrangement with LapLapLa. This page creates no new price or participant limit."] },
        { heading: "Contact and law", paragraphs: ["For another use, contact us through the support page or at omanchikim@gmail.com. This license does not limit rights that cannot be excluded under applicable law."] },
      ],
    },
  },
  he: {
    sale: {
      title: "תנאי מכירה למוצרים דיגיטליים",
      intro: "תנאים אלה חלים על מוצרים דיגיטליים בתשלום של LapLapLa. תיאור המוצר, מחירו וזמינותו מוצגים בדף המוצר ולפני התשלום.",
      sections: [
        { heading: "זהות המוכר", paragraphs: ["המוכר הוא המיזם הישראלי אומנצ׳קים (LapLapLa), הרשום כעוסק פטור, מספר רישום 337738868. לשאלות בנוגע לרכישה אפשר לפנות דרך דף התמיכה או בדוא״ל omanchikim@gmail.com."] },
        { heading: "מה נרכש", paragraphs: ["התשלום מקנה גישה למוצר הדיגיטלי המסוים ורישיון שימוש מוגבל בהתאם לרישיון החל עליו. זכויות היוצרים וזכות המכירה מחדש אינן מועברות לרוכש. תכולת המוצר נקבעת לפי התיאור בדף הרכישה; מוצרים אחרים עשויים להינתן בפורמטים שונים.", "תיק הצלילים מס׳ 001 הוא הרפתקה אינטראקטיבית עם התאמה אישית וחומרים להדפסה עצמית דרך הדפדפן. לא נשלחת ערכה פיזית ולא מסופק קובץ PDF מלא ומוכן להפצה חופשית."] },
        { heading: "תשלום וגישה", paragraphs: ["המחיר הסופי מוצג לפני אישור התשלום. התשלום מעובד באמצעות PayPal; לאחר אישורו הגישה משויכת לחשבון הרוכש. אישור התשלום, העמדת הגישה והשימוש בפועל הם אירועים נפרדים. אם הגישה אינה מופיעה, פנו לתמיכה ואל תשלמו שוב עד לבדיקת ההזמנה."] },
        { heading: "דרישות טכניות", paragraphs: ["לגישה נדרשים חשבון LapLapLa, דפדפן מודרני נתמך וחיבור לאינטרנט. להדפסת תיק הצלילים מס׳ 001 משתמשים במדפסת עצמית או בפונקציית ההדפסה של הדפדפן; עלויות נייר והדפסה אינן כלולות. חלק מהפעילויות האינטראקטיביות נפתחות באמצעות קודי QR על החומרים המודפסים."] },
        { heading: "שימוש ותמיכה", paragraphs: ["על חומרים להדפסה חל רישיון נפרד, לפי העניין. לשאלות על תשלום, גישה, תקלה טכנית, רישיון או ביטול עסקה, השתמשו בדף התמיכה או כתבו אל omanchikim@gmail.com. כל פנייה נבחנת לפי נסיבותיה; שליחת הטופס אינה מבטלת הזמנה כשלעצמה ואינה מאשרת החזר באופן אוטומטי."] },
        { heading: "זכויות הצרכן", paragraphs: ["תנאים אלה ותיאור המוצר אינם גורעים מזכויות צרכניות קוגנטיות לפי הדין החל. גם זכויות מחייבות החלות על רוכשים במדינות אחרות נשמרות."] },
      ],
    },
    refund: {
      title: "מדיניות החזרים וביטול עסקה",
      intro: "פניות נבחנות לפי סוג המוצר, העמדת הגישה, נסיבות הרכישה והזכויות הקוגנטיות של הצרכן.",
      sections: [
        { heading: "תשלום, גישה ושימוש", paragraphs: ["אישור התשלום אינו זהה להעמדת גישה, והעמדת גישה אינה זהה לשימוש בפועל. בעת בירור פנייה אנו בוחנים נסיבות אלה בנפרד."] },
        { heading: "שינוי החלטה", paragraphs: ["לאחר שהועמדה גישה למוצר דיגיטלי, ככל שהדין החל מאפשר זאת, בדרך כלל לא ניתן החזר מרצון בשל שינוי החלטה, אי־שימוש או חוסר שביעות רצון סובייקטיבי. זכות ביטול או סעד אחר המוקנים בחוק נשמרים. תחולתו של חריג הנוגע למידע דיגיטלי על מוצר מסוים נבחנת לפי הדין ואינה מונחת מראש."] },
        { heading: "בעיה ברכישה", paragraphs: ["פנו אלינו אם לא הועמדה גישה, קיימת תקלה טכנית מהותית או אי־התאמה מהותית לתיאור, בוצע חיוב שגוי או קיים טעם אחר המוכר בדין. נבדוק את ההזמנה ונציע את הסעד הנדרש לפי הדין החל, לרבות תיקון התקלה או החזר כאשר הוא מגיע."] },
        { heading: "דרכי פנייה", paragraphs: ["אפשר לפנות דרך דף התמיכה או לכתובת omanchikim@gmail.com ולציין את כתובת הדוא״ל של החשבון, מספר הזמנה אם יש, ותיאור הבעיה. ערוצים אלה אינם מגבילים דרכים אחרות למסירת הודעת ביטול על פי דין. אין לשלוח פרטי כרטיס או סיסמאות. הפנייה אינה מבטלת הזמנה באופן אוטומטי."] },
        { heading: "בירור והשבת תשלום", paragraphs: ["נאשר את קבלת הפנייה ונבחן אותה לפי הדין החל. כאשר אושר החזר, הסכום ודרך ההשבה תלויים בנסיבות ובאמצעי התשלום המקורי; מסמכים חשבונאיים מתקנים יופקו בנפרד. הקבלה המקורית אינה משתנה. אין החזר אוטומטי ללא בירור."] },
        { heading: "זכויות מחייבות", paragraphs: ["מדיניות זו אינה שוללת זכויות קוגנטיות בישראל או בכל מדינה שהדין שלה חל על העסקה, לרבות בשל אי־העמדת גישה, פגם או אי־התאמה מהותיים, או חיוב שגוי."] },
      ],
    },
    printable: {
      title: "רישיון לחומרים דיגיטליים להדפסה",
      intro: "רישיון זה חל רק על מוצרים שנרכשו ותיאורם כולל הדפסה עצמית. לפורמטים אחרים עשויים לחול תנאים משלהם.",
      sections: [
        { heading: "הרשאת השימוש", paragraphs: ["הרוכש מקבל רישיון מוגבל ולא בלעדי להשתמש במוצר לצורכי משחק אישיים ומשפחתיים. מותר להזמין קבוצה ולשחק יחד במשחק שנרכש. זכויות הגישה וזכויות היוצרים נשארות בידי בעליהן."] },
        { heading: "התאמה אישית והדפסה", paragraphs: ["מותר להתאים את החומרים באמצעות הכלים שסופקו, להדפיסם לצורך המשחק המותר ולהדפיסם שוב לצורך שימוש עצמי מותר. הרישיון אינו קובע מגבלה מספרית על משחקים משפחתיים או על הדפסות חוזרות. אם הדפדפן מציע שמירה כ־PDF, גם הקובץ שנשמר כפוף לאותן מגבלות שימוש."] },
        { heading: "פעולות המחייבות רשות נפרדת", paragraphs: ["אין למכור מחדש את המוצר, להעביר גישה לחשבון או עותקים דיגיטליים כדי שאחרים יפעילו משחקים נפרדים, לפרסם את החומרים, להעלותם לפלטפורמות מסחר, למכור ערכות מודפסות, להציג את היצירה כשלכם או להסיר הודעות בדבר זכויות יוצרים. משחק קבוצתי אינו מתיר הפצת עותקים."] },
        { heading: "קבוצות וחינוך", paragraphs: ["משחק עם קבוצה מוזמנת מותר לפי רישיון זה. רישיונות נפרדים לכיתה או למוסד חינוכי אינם מוצעים כעת; העברת חומרים בין כיתות או בין אנשי הוראה מחייבת הסדרה פרטנית עם LapLapLa. דף זה אינו קובע מחיר חדש או מגבלת משתתפים."] },
        { heading: "יצירת קשר והדין", paragraphs: ["לשימוש אחר פנו דרך דף התמיכה או לכתובת omanchikim@gmail.com. הרישיון אינו גורע מזכויות שלא ניתן להתנות עליהן לפי הדין החל."] },
      ],
    },
  },
};

export const shopLegalDisclosure: Record<Lang, { summary: string; sale: string; refund: string; printable: string }> = {
  ru: { summary: "Цифровой продукт: доступ через аккаунт и интернет, без физической доставки. Материалы Sound Case #001 печатаются самостоятельно через браузер; действует ограниченная лицензия. Условия возврата зависят от применимого закона.", sale: "Условия продажи", refund: "Возвраты и отмена", printable: "Лицензия для печати" },
  en: { summary: "Digital product: account and internet access, with no physical delivery. Sound Case #001 materials are self-printed through your browser under a limited license. Refund rights depend on applicable law.", sale: "Terms of Sale", refund: "Refunds and cancellation", printable: "Printable license" },
  he: { summary: "מוצר דיגיטלי: גישה דרך חשבון ואינטרנט, ללא משלוח פיזי. חומרי תיק הצלילים מס׳ 001 מודפסים עצמאית דרך הדפדפן בכפוף לרישיון מוגבל. זכויות ההחזר תלויות בדין החל.", sale: "תנאי מכירה", refund: "החזרים וביטול עסקה", printable: "רישיון להדפסה" },
};
