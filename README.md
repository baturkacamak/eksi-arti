# Ekşi Artı

**Ekşi Artı**, Ekşi Sözlük deneyimini geliştiren gelişmiş bir Chrome uzantısıdır. Kullanıcı yönetimi ve içerik kontrolü için çeşitli araçlar sunar.

## 🌟 Özellikler

### Toplu Kullanıcı Engelleme
- Bir yazıyı favorileyen kullanıcıları kolayca toplu olarak engelleyebilir veya sessize alabilirsiniz
- Sessiz alma (yazılarını görürsünüz) veya tamamen engelleme seçenekleri
- Başlık engelleme seçeneği
- Özel not ekleme imkanı
- İşlemi istediğiniz anda duraklatabilir ve daha sonra devam ettirebilirsiniz
- Sunucu yükünü azaltmak için yerleşik gecikme koruması
- Detaylı ilerleme bildirimleri

### Gelişmiş Arama ve Filtreleme
- **Sayfa içi gerçek zamanlı arama**: Entry'leri anında filtreleyin veya vurgulayın
- **İki arama modu**:
  - Filtre Modu: Yalnızca arama terimiyle eşleşen entry'leri gösterir
  - Vurgulama Modu: Tüm entry'leri gösterir ve eşleşmeleri vurgular
- **Türkçe karakter normalizasyonu**: ı/i, ö/o, ü/u, ç/c, ş/s, ğ/g otomatik eşleştirme
- **Gelişmiş arama seçenekleri**:
  - `*` - Herhangi bir karakter dizisi
  - `?` - Herhangi bir tek karakter
  - `|` - VEYA operatörü
  - `"kelime grubu"` - Tam eşleşen kelime grubu
- **Klavye kısayolları**:
  - `Ctrl+F` - Arama kutusuna odaklan
  - `Enter` - Sonraki eşleşme
  - `Shift+Enter` - Önceki eşleşme
  - `Esc` - Aramayı temizle

### Gelişmiş Yazar Yönetimi
- **Yazar vurgulama**: Yazarları özel renklerle vurgulayın
- **Yazar notları**: Yazarlara özel notlar ekleyin
- **Renk yönetimi**: 
  - Özel renk seçimi veya rastgele renk atama
  - Pastel renk seçenekleri
  - Kontrast hesaplaması ile otomatik metin rengi
- **Yazar istatistikleri**: Son görülme tarihi ve toplam entry sayısı
- **Toplu işlemler**: 
  - Yazar verilerini dışa/içe aktarma
  - Eski yazarları temizleme
  - Toplu renk değiştirme
- **Bağlam menüsü**: Entry'den direkt yazar ekleme

### Gelişmiş Entry Sıralama
- **Çoklu sıralama kriterleri**:
  - Tarih (yeni/eski)
  - Yazar adı
  - Entry uzunluğu
  - Favori sayısı
- **Kullanıcı profili tabanlı sıralama**
- **Özelleştirilebilir sıralama stratejileri**
- **Komut deseni ile genişletilebilir sıralama sistemi**

### Çöp Kutusu Yönetimi
- **Toplu geri getirme**: Seçili entry'leri toplu olarak geri getirin
- **Gelişmiş sayfa yükleme**: 
  - Sayfa sayfa yükleme
  - Tüm sayfaları otomatik yükleme
  - İptal edilebilir işlemler
- **Seçim sistemi**: Checkbox'larla kolay entry seçimi
- **Animasyonlar**: Yumuşak geçiş efektleri
- **Sayfa ayırıcıları**: Hangi sayfadan geldiğini görme

### Oy Takip Sistemi
- **Oy geçmişi izleme**: Kullanıcının oy verme paternlerini takip edin
- **Yapılandırılabilir izleme**: İzleme aralığını özelleştirin
- **Bildirim sistemi**: Oy değişikliklerinde bildirim alın
- **Önbellek yönetimi**: Performans için akıllı önbellekleme

### Ekran Görüntüsü ve Kopyalama
- **Gelişmiş ekran görüntüsü**: html2canvas ile yüksek kaliteli görüntü alma
- **Entry kopyalama**: Hızlı metin kopyalama düğmeleri
- **Komut tabanlı işlemler**: Genişletilebilir komut sistemi

### Bildirim Sistemi
- **Çoklu bildirim türleri**: Başarı, hata, uyarı, bilgi
- **Yapılandırılabilir konum**: 4 farklı köşe seçeneği
- **Otomatik kaybolma**: Ayarlanabilir süre
- **İlerleme bildirimleri**: Uzun işlemler için ilerleme çubuğu

### Tema ve Görünüm
- **Çoklu tema desteği**: Açık, koyu, sistem teması
- **Dinamik UI konteynerleri**: 
  - Özelleştirilebilir şekil ve boyutlar
  - Hover efektleri
  - Kenarlık seçenekleri
- **Responsive tasarım**: Farklı ekran boyutlarına uyum

### Erişilebilirlik
- **Klavye navigasyonu**: Tam klavye desteği
- **Ekran okuyucu uyumluluğu**: ARIA etiketleri
- **Yüksek kontrast modu**: Görme zorluğu çekenler için

## 📥 Kurulum

### Chrome Web Mağazası'ndan Kurulum (Yakında)
1. Chrome Web Mağazası'na gidin
2. "Ekşi Artı" yazarak arayın
3. "Chrome'a Ekle" düğmesine tıklayın

### Manuel Kurulum (Geliştirici Modu)
1. Projeyi ZIP olarak indirin veya klonlayın
2. Gerekirse ZIP dosyasını çıkarın
3. Uzantıyı derleyin:
   ```bash
   npm install
   npm run build
   ```
   Bu komut `builds` klasöründe paketlenmiş bir uzantı dosyası oluşturacaktır

4. Chrome'da `chrome://extensions/` sayfasına gidin
5. Sağ üstte "Geliştirici modu"nu etkinleştirin
6. İki seçenekten birini uygulayın:
   - "Paketlenmemiş öğe yükle"ye tıklayın ve `dist` klasörünü seçin
   - `builds` klasöründeki ZIP dosyasını Chrome uzantıları sayfasına sürükleyip bırakın

## 🚀 Kullanım

### Toplu Kullanıcı Engelleme
1. Herhangi bir Ekşi Sözlük yazı sayfasına gidin
2. Yazının "..." menüsüne tıklayın
3. "favorileyenleri engelle" seçeneğini seçin
4. Şunları yapabilirsiniz:
   - "Sessiz Al" - Kullanıcının yazılarını görmeye devam edin
   - "Engelle" - Kullanıcıyı tamamen engelleyin
   - "Başlık Engelle" - Kullanıcının açtığı başlıkları engelleyin

### Arama ve Filtreleme
1. Herhangi bir başlık sayfasında `Ctrl+F` tuşuna basın
2. Arama kutusuna terimi yazın
3. Filtre/Vurgulama modu arasında geçiş yapın
4. Gelişmiş arama operatörlerini kullanın:
   - `javascript*` - javascript ile başlayan
   - `*web*` - içinde web geçen
   - `"ekşi sözlük"` - tam eşleşme
   - `react|vue|angular` - herhangi birini içeren

### Yazar Yönetimi
1. Bir yazarın entry'sine sağ tıklayın
2. "Yazarı Vurgula" seçeneğini seçin
3. Renk seçin ve not ekleyin
4. Ayarlar sayfasından toplu işlemler yapın

### Entry Sıralama
1. Başlık sayfasında sıralama düğmelerini kullanın
2. Tarih, yazar adı, uzunluk gibi kriterlere göre sıralayın
3. Özel sıralama stratejileri ayarlayın

## ⚙️ Ayarlar

Uzantı simgesine tıklayarak ayarlar sayfasına erişebilirsiniz:

### Genel Ayarlar
- **Bildirimler**: Etkinleştir/Devre dışı bırak
- **Bildirim Süresi**: 1-10 saniye arası
- **Bildirim Konumu**: 4 köşe seçeneği
- **Tema**: Açık/Koyu/Sistem

### Engelleme Ayarları
- **Varsayılan Engelleme Türü**: Sessiz/Engelle/Başlık Engelle
- **İstek Gecikmesi**: Sunucu yükünü önlemek için gecikme
- **Yeniden Deneme**: Başarısız istekler için tekrar sayısı
- **Not Şablonu**: Otomatik not formatı

### Yazar Vurgulama Ayarları
- **Varsayılan Opaklık**: Vurgulama şeffaflığı
- **Animasyon**: Geçiş efektleri
- **Bağlam Menüsü**: Sağ tık menüsü

### Oy Takip Ayarları
- **İzleme Etkin**: Oy takibini etkinleştir
- **İzleme Aralığı**: Kontrol sıklığı (dakika)

### Gelişmiş Ayarlar
- **Debug Modu**: Geliştirici konsol mesajları
- **İşlem Geçmişi**: Geçmiş işlemleri kaydet
- **Önbellek Temizleme**: Performans optimizasyonu

## 🛠 Geliştirme

### Gereksinimler
- Node.js (v14+)
- npm veya yarn
- TypeScript
- Jest (testler için)

### Kurulum ve Çalıştırma
```bash
# Depoyu klonlayın
git clone https://github.com/kullanici/eksi-arti.git
cd eksi-arti

# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda izleme
npm run watch
```

### Chrome'da Test Etme
1. Chrome'da `chrome://extensions/` sayfasına gidin
2. Sağ üstte "Geliştirici modu"nu etkinleştirin
3. "Paketlenmemiş öğe yükle"ye tıklayın ve proje `dist` klasörünü seçin
4. `npm run watch` çalışırken yaptığınız değişiklikler otomatik olarak derlenecektir
5. Değişikliklerden sonra Chrome'daki uzantıyı yenilemek için yenile düğmesine tıklayın

### Üretim İçin Derleme
```bash
# Üretim için derleme (minified, kaynak haritası yok)
npm run build

# Dağıtım için ZIP olarak paketleme
npm run build:zip
```

### Mimar ve Tasarım Desenleri
- **Command Pattern**: Komutlar için (`src/commands/`)
- **Observer Pattern**: DOM değişiklikleri için (`src/services/observer-service.ts`)
- **Service Layer**: İş mantığı ayrımı (`src/services/`)
- **Dependency Injection**: Gevşek bağlılık (`src/di/`)
- **Event Bus**: Komponent iletişimi
- **Factory Pattern**: Component oluşturma

## 🧪 Test
```bash
# Tüm testleri çalıştır
npm test

# İzleme modunda test
npm run test:watch

# Kapsamlılık raporu
npm run test:coverage
```

## 📂 Proje Yapısı
```
eksi-arti/
├── dist/                    # Derlenmiş dosyalar
├── icons/                   # Uzantı simgeleri
├── src/                     # Kaynak kod
│   ├── components/          # UI bileşenleri
│   │   ├── features/        # Özellik bileşenleri
│   │   └── shared/          # Paylaşılan bileşenler
│   ├── services/            # Servis sınıfları
│   │   ├── block-users-service.ts     # Toplu engelleme
│   │   ├── author-highlighter-service.ts # Yazar vurgulama
│   │   ├── search-filter-service.ts   # Arama ve filtreleme
│   │   ├── trash-service.ts           # Çöp kutusu yönetimi
│   │   ├── vote-monitoring-service.ts # Oy takibi
│   │   ├── notification-service.ts    # Bildirimler
│   │   ├── storage-service.ts         # Veri saklama
│   │   ├── http-service.ts           # HTTP istekleri
│   │   └── observer-service.ts       # DOM izleme
│   ├── commands/            # Komut deseni implementasyonu
│   │   ├── blocking/        # Engelleme komutları
│   │   ├── screenshots/     # Ekran görüntüsü komutları
│   │   ├── copying/         # Kopyalama komutları
│   │   └── sorting/         # Sıralama komutları
│   ├── interfaces/          # TypeScript arayüzleri
│   ├── di/                  # Dependency injection
│   ├── factories/           # Factory sınıfları
│   ├── utils/               # Yardımcı fonksiyonlar
│   ├── content.ts           # İçerik betiği
│   ├── background.ts        # Arka plan betiği
│   ├── options.ts           # Ayarlar sayfası
│   ├── constants.ts         # Sabitler ve numaralandırmalar
│   └── types.ts             # TypeScript tip tanımları
├── tests/                   # Test dosyaları
├── scripts/                 # Build ve yardımcı scriptler
├── manifest.json            # Uzantı manifestosu
├── options.html             # Ayarlar sayfası HTML
├── options.css              # Ayarlar sayfası stilleri
├── webpack.*.js             # Webpack konfigürasyonları
├── tailwind.config.js       # Tailwind CSS konfigürasyonu
├── tsconfig.json            # TypeScript konfigürasyonu
├── jest.config.js           # Jest test konfigürasyonu
└── package.json             # Proje bağımlılıkları
```

## 🔧 Kullanılan Teknolojiler
- **TypeScript**: Tip güvenli JavaScript
- **Webpack**: Modül paketleyici
- **Tailwind CSS**: Utility-first CSS framework
- **Jest**: Test framework
- **html2canvas**: DOM elementlerini görüntüye çevirme
- **Chrome Extensions API**: Tarayıcı uzantı geliştirme

## 📋 Katkıda Bulunma
1. Projeyi forklayın
2. Kendi branch'ınızı oluşturun (`git checkout -b ozellik/harika-eklenti`)
3. Değişikliklerinizi commit edin (`git commit -m 'Harika bir özellik ekledim'`)
4. Branch'ınıza push yapın (`git push origin ozellik/harika-eklenti`)
5. Bir Pull Request açın

### Katkı Yönergeleri
- Kod standartlarına uyun (ESLint/Prettier)
- Test yazın ve mevcut testlerin geçtiğinden emin olun
- Commit mesajlarını açıklayıcı yazın
- Büyük değişiklikler için önce issue açın

## 📄 Lisans
MIT Lisansı altında yayımlanmıştır. Detaylar için LICENSE dosyasına bakın.

## ⚠️ Sorumluluk Reddi
Bu uzantı Ekşi Sözlük ile resmi olarak ilişkili değildir. Kullanırken site kurallarına ve görgü kurallarına özen gösterin.

## 🔄 Sürüm Geçmişi
- **v1.0.0**: İlk sürüm
  - Toplu kullanıcı engelleme
  - Temel yazar vurgulama
  - Entry sıralama
  - Çöp kutusu yönetimi
  - Arama ve filtreleme
  - Oy takip sistemi