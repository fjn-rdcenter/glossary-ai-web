// Translation function
export function translate(key: string, language: string): string {
  const translations: Record<string, Record<string, string>> = {
    Contact: {
      en: "Contact",
      vn: "Liên hệ",
      jp: "お問い合わせ"
    },
    Address: {
      en: "Floor 9, Block C, Waseco Building, 10 Pho Quang Street, Tan Son Hoa Ward, Ho Chi Minh City",
      vn: "Tầng 9, Tòa C, Tòa nhà Waseco, 10 Phổ Quang, Phường Tân Sơn Nhì, TP. Hồ Chí Minh",
      jp: "ベトナム国ホーチミン市タンソンホア区フォークアン通り10番地ワセコビルディングCブロック9階"
    },
    PhoneVN: {
      en: "(VN) (84-28) 3847-7000",
      vn: "(VN) (84-28) 3847-7000",
      jp: "(VN) (84-28) 3847-7000"
    },
    PhoneJP: {
      en: "(JP) (81-3) 5579-9961",
      vn: "(JP) (81-3) 5579-9961",
      jp: "(JP) (81-3) 5579-9961"
    },
    Email: {
      en: "Email: info@fujinet.net",
      vn: "Email: info@fujinet.net",
      jp: "メール: info@fujinet.net"
    },
    MainPages: {
      en: "Main Pages",
      vn: "Trang chính",
      jp: "メインページ"
    }
  };

  return translations[key]?.[language] || translations[key]?.["en"] || key;
}
