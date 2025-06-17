# Ekşi Artı

**Ekşi Artı**, Ekşi Sözlük deneyimini geliştiren gelişmiş bir Chrome uzantısıdır. Kullanıcı yönetimi, içerik kontrolü, arama, filtreleme ve çok daha fazlası için kapsamlı araçlar sunar.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=flat-square&logo=googlechrome)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square&logo=typescript)
![Version](https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## 📋 İçindekiler

- [🌟 Özellikler](#-özellikler)
- [📥 Kurulum](#-kurulum)
- [🚀 Kullanım](#-kullanım)
- [⚙️ Ayarlar](#️-ayarlar)
- [🛠 Geliştirme](#-geliştirme)
- [🏗️ Mimari](#️-mimari)
- [🧪 Test](#-test)
- [📂 Proje Yapısı](#-proje-yapısı)
- [🔧 Teknik Detaylar](#-teknik-detaylar)
- [🤝 Katkıda Bulunma](#-katkıda-bulunma)
- [📄 Lisans](#-lisans)

## 🌟 Özellikler

### 🚫 Toplu Kullanıcı Engelleme
- **Bulk Blocking**: Bir yazıyı favorileyen kullanıcıları kolayca toplu olarak engelleyebilir veya sessize alabilirsiniz
- **Çoklu Engelleme Seçenekleri**:
  - Sessiz alma (yazılarını görürsünüz)
  - Tamamen engelleme
  - Başlık engelleme seçeneği
- **Akıllı İşlem Yönetimi**:
  - Özel not ekleme imkanı
  - İşlemi istediğiniz anda duraklatabilir ve daha sonra devam ettirebilirsiniz
  - Sunucu yükünü azaltmak için yerleşik gecikme koruması
  - Detaylı ilerleme bildirimleri
  - Hata durumunda otomatik yeniden deneme
- **Çoklu Entry Desteği**: Birden fazla yazıyı aynı anda işleme alma
- **Durum Kaydetme**: İşlemi yarıda bırakıp daha sonra devam etme

### 🔍 Gelişmiş Arama ve Filtreleme
- **Gerçek Zamanlı Arama**: Entry'leri anında filtreleyin veya vurgulayın
- **İki Arama Modu**:
  - **Filtre Modu**: Yalnızca arama terimiyle eşleşen entry'leri gösterir
  - **Vurgulama Modu**: Tüm entry'leri gösterir ve eşleşmeleri vurgular
- **Gelişmiş Arama Operatörleri**:
  - `*` - Herhangi bir karakter dizisi (wildcard)
  - `?` - Herhangi bir tek karakter
  - `|` - VEYA operatörü (multiple terms)
  - `"kelime grubu"` - Tam eşleşen kelime grubu (exact match)
- **Türkçe Karakter Normalizasyonu**: ı/i, ö/o, ü/u, ç/c, ş/s, ğ/g otomatik eşleştirme
- **Klavye Kısayolları**:
  - `Ctrl+F` - Arama kutusuna odaklan
  - `Enter` - Sonraki eşleşme
  - `Shift+Enter` - Önceki eşleşme
  - `Esc` - Aramayı temizle
- **Arama Geçmişi**: Son aramaları hatırlama ve hızlı erişim
- **RegEx Desteği**: Gelişmiş kullanıcılar için düzenli ifade desteği

### 🎨 Gelişmiş Yazar Yönetimi
- **Yazar Vurgulama**: Yazarları özel renklerle vurgulayın
- **Yazar Notları**: Yazarlara özel notlar ekleyin ve yönetin
- **Renk Yönetimi**: 
  - Özel renk seçici ile renk belirleme
  - Rastgele renk atama
  - Pastel renk seçenekleri
  - Kontrast hesaplaması ile otomatik metin rengi
  - Hex, RGB ve HSL renk formatları desteği
- **Yazar İstatistikleri**: 
  - Son görülme tarihi takibi
  - Toplam entry sayısı
  - Yazar aktivite oranları
- **Toplu İşlemler**: 
  - Yazar verilerini JSON formatında dışa/içe aktarma
  - Eski yazarları temizleme (configurable threshold)
  - Toplu renk değiştirme
  - Toplu not güncelleme
- **Bağlam Menüsü**: Entry'den direkt yazar ekleme (sağ tık)
- **Otomatik Vurgulama**: Yeni entry'lerde otomatik yazar tanıma

### 📊 Gelişmiş Entry Sıralama
- **Çoklu Sıralama Kriterleri**:
  - Tarih (yeni/eski)
  - Yazar adı (alfabetik)
  - Entry uzunluğu
  - Favori sayısı
- **Kullanıcı Profili Tabanlı Sıralama**:
  - Kullanıcı seviyesi
  - Hesap yaşı
  - Aktivite oranı
  - Takipçi sayısı
  - Takip oranı
  - Toplam entry sayısı
  - Etkileşim oranı
- **Özelleştirilebilir Sıralama Stratejileri**
- **Command Pattern**: Genişletilebilir sıralama sistemi
- **Veri Odaklı Sıralama**: Kullanıcı verilerine dayalı akıllı sıralama

### 🗑️ Çöp Kutusu Yönetimi
- **Toplu Geri Getirme**: Seçili entry'leri toplu olarak geri getirin
- **Gelişmiş Sayfa Yükleme**: 
  - Sayfa sayfa yükleme sistemi
  - Tüm sayfaları otomatik yükleme
  - İptal edilebilir işlemler
  - Progress tracking
- **Gelişmiş Seçim Sistemi**: 
  - Checkbox'larla kolay entry seçimi
  - Tümünü seç/hiçbirini seçme
  - Seçim sayacı
- **Animasyonlar**: Yumuşak geçiş efektleri
- **Sayfa Ayırıcıları**: Hangi sayfadan geldiğini görme
- **Batch Processing**: Büyük miktarlarda entry'yi verimli işleme

### 📈 Oy Takip Sistemi
- **Oy Geçmişi İzleme**: Kullanıcının oy verme paternlerini takip edin
- **Yapılandırılabilir İzleme**: İzleme aralığını özelleştirin (dakika bazında)
- **Bildirim Sistemi**: Oy değişikliklerinde anlık bildirim
- **Cache Yönetimi**: Performans için akıllı önbellekleme
- **Kullanıcı Adı Çıkarma**: Otomatik kullanıcı tanıma ve cache'leme
- **Background Processing**: Arka planda sürekli izleme

### 📷 Ekran Görüntüsü ve Kopyalama
- **Gelişmiş Ekran Görüntüsü**: 
  - html2canvas ile yüksek kaliteli görüntü alma
  - Seçili alan ekran görüntüsü
  - Full entry capture
- **Entry Kopyalama**: 
  - Hızlı metin kopyalama düğmeleri
  - Formatted text kopyalama
  - Plain text kopyalama
- **Command Pattern**: Genişletilebilir komut sistemi
- **Export Seçenekleri**: Farklı formatlarda dışa aktarma

### 🔔 Gelişmiş Bildirim Sistemi
- **Çoklu Bildirim Türleri**: Başarı, hata, uyarı, bilgi
- **Yapılandırılabilir Konum**: 4 farklı köşe seçeneği (top-right, top-left, bottom-right, bottom-left)
- **Otomatik Kaybolma**: Ayarlanabilir süre (1-10 saniye)
- **İlerleme Bildirimleri**: Uzun işlemler için ilerleme çubuğu
- **Sticky Notifications**: Kalıcı bildirimler
- **Rich Notifications**: HTML içerikli bildirimler
- **Sound Support**: Ses bildirimi seçenekleri

### 🎨 Tema ve Görünüm
- **Çoklu Tema Desteği**: 
  - Açık tema
  - Koyu tema
  - Sistem teması (otomatik)
- **Dinamik UI Konteynerleri**: 
  - 8 farklı tema seçeneği (default, primary, secondary, info, warning, danger, success, neutral)
  - 3 boyut seçeneği (small, medium, large)
  - 4 şekil seçeneği (square, slightly-rounded, rounded, pill)
  - Hover efektleri
  - Gölge ve kenarlık seçenekleri
- **Responsive Tasarım**: Farklı ekran boyutlarına uyum
- **Material Design Icons**: Google Material Icons entegrasyonu
- **CSS Custom Properties**: Dinamik tema değişkenleri

### ♿ Erişilebilirlik
- **Klavye Navigasyonu**: Tam klavye desteği
- **Ekran Okuyucu Uyumluluğu**: ARIA etiketleri ve semantic markup
- **Yüksek Kontrast Modu**: Görme zorluğu çekenler için
- **Focus Management**: Keyboard focus yönetimi
- **Alternative Text**: Tüm görseller için alt text

### 🔧 Gelişmiş Özellikler
- **Dependency Injection**: Modern DI container sistemi
- **Event Bus**: Component'lar arası iletişim
- **Observer Pattern**: DOM değişikliklerini izleme
- **Command Pattern**: Genişletilebilir komut sistemi
- **Service Layer Architecture**: Temiz kod mimarisi
- **TypeScript**: Full type safety
- **Webpack Build System**: Modern build pipeline
- **Jest Testing**: Comprehensive test coverage

## 📥 Kurulum

### Chrome Web Mağazası'ndan Kurulum (Yakında)
1. Chrome Web Mağazası'na gidin
2. "Ekşi Artı" yazarak arayın
3. "Chrome'a Ekle" düğmesine tıklayın

### Manuel Kurulum (Geliştirici Modu)

#### Ön Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn
- Chrome/Chromium tabanlı tarayıcı
- Git (isteğe bağlı)

#### Kurulum Adımları
1. **Projeyi İndirin**:
   ```bash
   # Git ile klonlama
   git clone https://github.com/kullanici/eksi-arti.git
   cd eksi-arti
   
   # Veya ZIP olarak indirip çıkarın
   ```

2. **Bağımlılıkları Yükleyin**:
   ```bash
   npm install
   # veya
   yarn install
   ```

3. **Uzantıyı Derleyin**:
   ```bash
   # Development build
   npm run build
   
   # Production build (minified)
   npm run build:prod
   
   # ZIP paket oluşturma
   npm run build:zip
   ```

4. **Chrome'a Yükleyin**:
   - Chrome'da `chrome://extensions/` sayfasına gidin
   - Sağ üstte "Geliştirici modu"nu etkinleştirin
   - "Paketlenmemiş öğe yükle"ye tıklayın ve `dist` klasörünü seçin
   - Veya `builds` klasöründeki ZIP dosyasını sürükleyip bırakın

## 🚀 Kullanım

### Toplu Kullanıcı Engelleme

#### Temel Kullanım
1. Herhangi bir Ekşi Sözlük yazı sayfasına gidin
2. Yazının "..." menüsüne tıklayın
3. "favorileyenleri engelle" seçeneğini seçin
4. Engelleme türünü seçin:
   - **Sessiz Al**: Kullanıcının yazılarını görmeye devam edin
   - **Engelle**: Kullanıcıyı tamamen engelleyin
   - **Başlık Engelle**: Kullanıcının açtığı başlıkları engelleyin

#### Gelişmiş Özellikler
- **Çoklu Entry İşleme**: Birden fazla yazıyı aynı anda işleme alın
- **İşlemi Duraklat/Devam Et**: Uzun işlemleri kontrol edin
- **Progress Tracking**: Gerçek zamanlı ilerleme takibi
- **Custom Notes**: Her kullanıcı için özel notlar
- **Automatic Retry**: Başarısız isteklerde otomatik tekrar deneme

### Arama ve Filtreleme

#### Hızlı Arama
1. Herhangi bir başlık sayfasında `Ctrl+F` tuşuna basın
2. Arama terimini yazın
3. Enter ile sonraki eşleşmeye gidin

#### Gelişmiş Arama Operatörleri
```
javascript*          # javascript ile başlayan
*web*               # içinde web geçen
"ekşi sözlük"       # tam eşleşme
react|vue|angular   # herhangi birini içeren
prog?amming         # programing veya programming
```

#### Arama Modları
- **Filter Mode**: Sadece eşleşen entry'leri göster
- **Highlight Mode**: Tüm entry'leri göster, eşleşmeleri vurgula

### Yazar Yönetimi

#### Yazar Vurgulama
1. Bir yazarın entry'sine sağ tıklayın
2. "Yazarı Vurgula" seçeneğini seçin
3. Renk seçin ve not ekleyin
4. Otomatik vurgulama başlar

#### Toplu İşlemler
1. Ayarlar sayfasını açın
2. "Yazar Yönetimi" bölümüne gidin
3. İstediğiniz toplu işlemi gerçekleştirin:
   - Export/Import
   - Eski yazarları temizle
   - Toplu renk değiştirme

### Entry Sıralama

#### Temel Sıralama
1. Başlık sayfasında sıralama kontrollerini bulun
2. İstediğiniz kritere göre sıralayın:
   - Tarih (yeni/eski)
   - Yazar adı
   - Entry uzunluğu
   - Favori sayısı

#### Gelişmiş Sıralama
1. Ayarlardan "Sıralama Stratejileri"ni açın
2. Kullanıcı profili tabanlı sıralama seçeneklerini kullanın
3. Custom sorting criteria tanımlayın

### Çöp Kutusu Yönetimi

#### Toplu Geri Getirme
1. Çöp kutusu sayfasına gidin (`/cop`)
2. Geri getirmek istediğiniz entry'leri seçin
3. "Seçilenleri Geri Getir" butonuna tıklayın

#### Sayfa Yükleme
- **Next Page**: Bir sonraki sayfayı yükle
- **Load All**: Tüm sayfaları otomatik yükle (dikkatli kullanın)
- **Cancel**: İşlemi iptal et

## ⚙️ Ayarlar

Uzantı simgesine tıklayarak veya `chrome://extensions/` → Ekşi Artı → "Seçenekler" ile ayarlar sayfasına erişebilirsiniz.

### 🔧 Genel Ayarlar
- **Tema**: Açık/Koyu/Sistem
- **Dil**: Türkçe/İngilizce (gelecek sürümlerde)
- **Debug Modu**: Geliştirici konsol mesajları

### 🔔 Bildirim Ayarları
- **Bildirimleri Etkinleştir**: Tüm bildirimleri aç/kapat
- **Bildirim Süresi**: 1-10 saniye arası
- **Bildirim Konumu**: 4 köşe seçeneği
- **Ses Bildirimleri**: Ses efektleri (gelecek sürümlerde)

### 🚫 Engelleme Ayarları
- **Varsayılan Engelleme Türü**: Sessiz/Engelle/Başlık Engelle
- **İstek Gecikmesi**: Sunucu yükünü önlemek için gecikme (1-30 saniye)
- **Yeniden Deneme Sayısı**: Başarısız istekler için tekrar sayısı (1-10)
- **Yeniden Deneme Gecikmesi**: Tekrar deneme arasındaki süre
- **Not Şablonu**: Otomatik not formatı
  - `{baslikAdi}` - Başlık adı
  - `{islemTuru}` - İşlem türü
  - `{yaziLinki}` - Yazı linki
  - `{tarih}` - İşlem tarihi

### 🎨 Yazar Vurgulama Ayarları
- **Vurgulamayı Etkinleştir**: Yazar vurgulama sistemini aç/kapat
- **Varsayılan Opaklık**: Vurgulama şeffaflığı (0.1-1.0)
- **Animasyon Süresi**: Geçiş efekti süresi (ms)
- **Bağlam Menüsü**: Sağ tık menüsünü etkinleştir
- **Otomatik Renk**: Yeni yazarlar için otomatik renk atama
- **Pastel Renkler**: Daha yumuşak renk paleti kullan

### 📊 Oy Takip Ayarları
- **İzleme Etkin**: Oy takibini etkinleştir/devre dışı bırak
- **İzleme Aralığı**: Kontrol sıklığı (1-60 dakika)
- **Bildirim Gönder**: Oy değişikliklerinde bildirim
- **Cache Süresi**: Verileri ne kadar süre sakla

### 🔍 Arama Ayarları
- **Türkçe Karakter Normalizasyonu**: Otomatik karakter eşleştirme
- **Büyük/Küçük Harf Duyarlılığı**: Case sensitive arama
- **RegEx Desteği**: Düzenli ifade kullanımı
- **Arama Geçmişi**: Son aramaları kaydet
- **Otomatik Tamamlama**: Arama önerileri

### 🗑️ Çöp Kutusu Ayarları
- **Otomatik Sayfa Yükleme**: Sayfa geçişlerinde otomatik yükleme
- **Animasyon Efektleri**: Görsel efektleri etkinleştir
- **Batch Boyutu**: Aynı anda işlenecek entry sayısı

### 📁 Veri Yönetimi
- **İşlem Geçmişi**: Gerçekleştirilen işlemleri kaydet
- **Otomatik Yedekleme**: Periyodik veri yedekleme
- **Veri Temizleme**: Eski verileri otomatik temizle
- **Export/Import**: Ayarları yedekle ve geri yükle

## 🛠 Geliştirme

### Gereksinimler
- Node.js (v14+)
- npm veya yarn
- TypeScript
- Chrome/Chromium
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

# Development build
npm run dev

# Production build
npm run build

# Tests
npm test

# Linting
npm run lint

# Type checking
npm run type-check
```

### Chrome'da Test Etme

#### Development Mode
1. `npm run watch` çalıştırın (otomatik derleme için)
2. Chrome'da `chrome://extensions/` sayfasına gidin
3. "Geliştirici modu"nu etkinleştirin
4. "Paketlenmemiş öğe yükle"ye tıklayın ve `dist` klasörünü seçin
5. Değişiklikler otomatik derlenecek, uzantıyı yenileyin

#### Hot Reload
- Webpack watch mode ile otomatik derleme
- Content script değişikliklerinde sayfa yenileme
- Background script değişikliklerinde uzantı yenileme

### Build Süreçleri

#### Development Build
```bash
npm run dev
# Webpack dev config kullanır
# Source maps dahil
# Minification yok
# Fast build
```

#### Production Build
```bash
npm run build
# Webpack prod config kullanır
# Minified code
# Optimized assets
# No source maps
```

#### Package Creation
```bash
npm run build:zip
# Production build + ZIP packaging
# builds/ klasöründe .zip dosyası
# Chrome Web Store'a yüklemeye hazır
```

## 🏗️ Mimari

### Design Patterns

#### Dependency Injection
```typescript
// DI Container kullanımı
const container = initializeDI();
const service = container.resolve<MyService>('MyService');
```

#### Command Pattern
```typescript
// Komut tabanlı işlemler
const command = commandFactory.create('SortEntries', { criteria: 'date' });
commandInvoker.execute(command);
```

#### Observer Pattern
```typescript
// DOM değişikliklerini izleme
const observerId = observerService.observe({
    selector: '.entry',
    handler: (entries) => { /* process entries */ },
    processExisting: true
});
```

#### Service Layer
```typescript
// Servis katmanı mimarisi
class BlockUsersService {
    constructor(
        private httpService: IHttpService,
        private storageService: IStorageService,
        private notificationService: INotificationService
    ) {}
}
```

### Katmanlı Mimari

```
┌─────────────────────────────────────┐
│           UI Components             │ ← React-like components
├─────────────────────────────────────┤
│           Features Layer            │ ← Feature-specific logic
├─────────────────────────────────────┤
│           Services Layer            │ ← Business logic
├─────────────────────────────────────┤
│         Infrastructure             │ ← HTTP, Storage, DOM
├─────────────────────────────────────┤
│        Chrome APIs/Browser         │ ← Native browser APIs
└─────────────────────────────────────┘
```

### Component Architecture

#### Base Components
- **BaseComponent**: Tüm component'ların base class'ı
- **BaseFeatureComponent**: Feature component'ları için base
- **ComponentContainer**: UI container yönetimi

#### Shared Components
- IconComponent, ButtonComponent, ModalComponent
- NotificationComponent, ProgressBarComponent
- TooltipComponent, AccordionComponent

#### Feature Components
- SearchFilterComponent
- AuthorHighlightComponent
- BlockingControlsComponent

### Service Architecture

#### Core Services
- **DOMService**: DOM manipulation
- **HttpService**: HTTP requests with retry logic
- **StorageService**: Chrome storage API wrapper
- **CSSService**: Dynamic CSS injection

#### Feature Services
- **BlockUsersService**: Bulk user blocking
- **AuthorHighlighterService**: Author highlighting
- **TrashService**: Trash management
- **VoteMonitoringService**: Vote tracking

#### Infrastructure Services
- **LoggingService**: Structured logging
- **NotificationService**: Toast notifications
- **PreferencesService**: Settings management
- **EventBus**: Inter-component communication

## 🧪 Test

### Test Yapılandırması
```bash
# Tüm testleri çalıştır
npm test

# İzleme modunda test
npm run test:watch

# Kapsamlılık raporu
npm run test:coverage

# Specific test file
npm test -- --testPathPattern=BlockUsersService
```

### Test Türleri

#### Unit Tests
```typescript
// Service testleri
describe('BlockUsersService', () => {
    it('should block users successfully', async () => {
        // Test implementation
    });
});
```

#### Integration Tests
```typescript
// Component entegrasyon testleri
describe('SearchFilterComponent Integration', () => {
    it('should filter entries correctly', async () => {
        // Test implementation
    });
});
```

#### E2E Tests (Gelecek)
- Cypress ile browser automation
- Real EksiSozluk interaction testing

### Mock Stratejileri
- Chrome APIs mocking
- HTTP service mocking
- DOM manipulation mocking
- Storage service mocking

## 📂 Proje Yapısı

```
eksi-arti/
├── 📁 dist/                           # Derlenmiş dosyalar
├── 📁 builds/                         # Paketlenmiş uzantı dosyaları
├── 📁 icons/                          # Uzantı simgeleri
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── 📁 src/                           # Kaynak kod
│   ├── 📁 components/                # UI bileşenleri
│   │   ├── 📁 features/              # Özellik bileşenleri
│   │   │   ├── search-filter-component.ts
│   │   │   └── author-highlight-component.ts
│   │   ├── 📁 shared/                # Paylaşılan bileşenler
│   │   │   ├── button-component.ts
│   │   │   ├── modal-component.ts
│   │   │   ├── notification-component.ts
│   │   │   ├── progress-widget-component.ts
│   │   │   └── tooltip-component.ts
│   │   └── 📁 blocking/              # Engelleme bileşenleri
│   ├── 📁 services/                  # Servis sınıfları
│   │   ├── block-users-service.ts    # Toplu engelleme
│   │   ├── author-highlighter-service.ts # Yazar vurgulama
│   │   ├── trash-service.ts          # Çöp kutusu yönetimi
│   │   ├── vote-monitoring-service.ts # Oy takibi
│   │   ├── http-service.ts           # HTTP istekleri
│   │   ├── storage-service.ts        # Veri depolama
│   │   ├── notification-service.ts   # Bildirimler
│   │   ├── dom-service.ts            # DOM manipülasyonu
│   │   ├── css-service.ts            # CSS injection
│   │   ├── logging-service.ts        # Loglama
│   │   ├── preferences-service.ts    # Ayar yönetimi
│   │   ├── container-service.ts      # UI container'ları
│   │   ├── container-theme-service.ts # Tema yönetimi
│   │   ├── observer-service.ts       # DOM gözlemleme
│   │   ├── event-bus.ts              # Event sistemi
│   │   ├── font-loader-service.ts    # Font yükleme
│   │   ├── communication-service.ts   # Background iletişimi
│   │   ├── accessibility-service.ts   # Erişilebilirlik
│   │   └── utilities.ts              # Yardımcı fonksiyonlar
│   ├── 📁 commands/                  # Command pattern
│   │   ├── 📁 blocking/              # Engelleme komutları
│   │   ├── 📁 sorting/               # Sıralama komutları
│   │   │   ├── 📁 strategies/        # Sıralama stratejileri
│   │   │   │   ├── DateSortingStrategy.ts
│   │   │   │   ├── AuthorSortingStrategy.ts
│   │   │   │   ├── LengthSortingStrategy.ts
│   │   │   │   └── UserProfileStrategies.ts
│   │   │   └── SortEntriesCommand.ts
│   │   ├── 📁 entries/               # Entry komutları
│   │   ├── 📁 screenshots/           # Ekran görüntüsü
│   │   ├── 📁 copying/               # Kopyalama
│   │   ├── CommandFactory.ts         # Komut fabrikası
│   │   ├── CommandInvoker.ts         # Komut çalıştırıcı
│   │   └── CommandHistory.ts         # Komut geçmişi
│   ├── 📁 interfaces/                # TypeScript arayüzleri
│   │   ├── 📁 services/              # Servis arayüzleri
│   │   ├── 📁 components/            # Component arayüzlери
│   │   └── 📁 commands/              # Komut arayüzleri
│   ├── 📁 di/                        # Dependency Injection
│   │   └── initialize-di.ts          # DI container kurulumu
│   ├── 📁 ui/                        # UI katmanı
│   │   ├── 📁 components/            # UI bileşenleri
│   │   ├── 📁 services/              # UI servisleri
│   │   └── 📁 interfaces/            # UI arayüzleri
│   ├── 📁 core/                      # Temel sınıflar
│   ├── 📁 infrastructure/            # Altyapı katmanı
│   ├── 📁 constants/                 # Sabitler
│   │   └── fonts.ts                  # Font tanımlamaları
│   ├── 📁 utils/                     # Yardımcı fonksiyonlar
│   ├── 📁 types/                     # TypeScript tip tanımları
│   ├── 📁 factories/                 # Factory pattern
│   ├── 📁 test/                      # Test utilities
│   ├── content.ts                    # Ana content script
│   ├── background.ts                 # Background script
│   ├── options.ts                    # Ayarlar sayfası
│   ├── constants.ts                  # Genel sabitler
│   └── types.ts                      # Tip tanımları
├── 📁 tests/                         # Test dosyaları
│   ├── 📁 unit/                      # Unit testler
│   ├── 📁 integration/               # Entegrasyon testleri
│   └── 📁 fixtures/                  # Test verileri
├── 📁 scripts/                       # Build scriptleri
│   └── package-extension.js          # Paketleme scripti
├── 📁 resources/                     # Kaynak dosyalar
├── 📁 examples/                      # Örnek kodlar
├── 📄 manifest.json                  # Chrome uzantı manifestoası
├── 📄 options.html                   # Ayarlar sayfası HTML
├── 📄 options.css                    # Ayarlar sayfası CSS
├── 📄 package.json                   # Node.js bağımlılıkları
├── 📄 tsconfig.json                  # TypeScript yapılandırması
├── 📄 webpack.common.js              # Webpack ortak ayarları
├── 📄 webpack.dev.js                 # Development build
├── 📄 webpack.prod.js                # Production build
├── 📄 postcss.config.js              # PostCSS yapılandırması
├── 📄 tailwind.config.js             # Tailwind CSS ayarları
├── 📄 jest.config.js                 # Jest test yapılandırması
└── 📄 README.md                      # Bu dosya
```

## 🔧 Teknik Detaylar

### Teknoloji Stack'i
- **TypeScript**: Full type safety ve modern JavaScript
- **Webpack**: Module bundling ve build optimization
- **PostCSS + Tailwind**: Modern CSS processing
- **Jest**: Unit ve integration testing
- **Chrome Extension Manifest V3**: Modern extension API
- **Material Design Icons**: Consistent iconography
- **html2canvas**: Screenshot functionality

### Performans Optimizasyonları
- **Lazy Loading**: Component'ları ihtiyaç duyulduğunda yükle
- **Debouncing**: Arama ve scroll event'lerinde performans
- **Memoization**: Pahalı hesaplamaları cache'le
- **Virtual Scrolling**: Büyük listelerde performans
- **Service Worker**: Background işlemler için
- **IndexedDB**: Büyük veri setleri için local storage

### Güvenlik Önlemleri
- **Content Security Policy**: XSS koruması
- **Input Validation**: Tüm kullanıcı girdilerini doğrula
- **Rate Limiting**: API isteklerinde hız sınırı
- **HTTPS Only**: Güvenli bağlantı zorunluluğu
- **Permission Principle**: Minimum gerekli izinler

### Browser Uyumluluğu
- ✅ Chrome 88+
- ✅ Chromium 88+
- ✅ Edge 88+
- ✅ Opera 74+
- ❌ Firefox (farklı extension API)
- ❌ Safari (farklı extension API)

### API Kullanımı
```typescript
// Chrome Extension APIs
chrome.storage.sync.get()
chrome.storage.local.set()
chrome.runtime.sendMessage()
chrome.contextMenus.create()
chrome.notifications.create()
chrome.alarms.create()
chrome.tabs.query()
```

### Veri Yapıları
```typescript
// Author Highlight Data
interface AuthorHighlight {
    color: string;
    opacity: number;
    notes: string;
    enabled: boolean;
    lastSeen: number;
    entryCount: number;
}

// Block Operation Data
interface BlockOperationRequest {
    entryId: string;
    blockType: BlockType;
    includeThreadBlocking: boolean;
    customNote?: string;
}

// Search Pattern
interface SearchPattern {
    query: string;
    caseSensitive: boolean;
    useRegex: boolean;
    normalizeText: boolean;
}
```

## 🤝 Katkıda Bulunma

### Katkı Türleri
- 🐛 **Bug Reports**: Hata bildirimleri
- 💡 **Feature Requests**: Yeni özellik önerileri
- 📝 **Documentation**: Dokümantasyon iyileştirmeleri
- 🧪 **Testing**: Test yazma ve iyileştirme
- 🌐 **Translations**: Çeviri desteği
- 🎨 **UI/UX**: Tasarım iyileştirmeleri

### Geliştirme Süreci
1. **Issue Oluştur**: Önce issue açarak önerinizi tartışın
2. **Fork & Clone**: Projeyi fork'layın ve local'e kopyalayın
3. **Branch Oluştur**: Feature branch oluşturun
4. **Develop**: Kodu yazın ve test edin
5. **Test**: Unit ve integration testlerini çalıştırın
6. **Commit**: Anlamlı commit mesajları yazın
7. **Pull Request**: Detaylı PR açıklaması yapın

### Kod Standartları
```typescript
// ESLint + Prettier kullanın
npm run lint
npm run format

// TypeScript strict mode
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true

// Naming conventions
class MyService { }          // PascalCase for classes
const myVariable = '';       // camelCase for variables
interface IMyInterface { }   // Interface prefix with 'I'
enum MyEnum { }             // PascalCase for enums
```

### Commit Message Format
```
type(scope): description

feat(search): add regex support for advanced search
fix(blocking): resolve timeout issue in bulk operations
docs(readme): update installation instructions
test(services): add unit tests for AuthorService
refactor(ui): reorganize component structure
style(css): fix indentation in theme files
perf(observer): optimize DOM mutation handling
```

### PR Checklist
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## 📄 Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

### Üçüncü Taraf Kütüphaneler
- **html2canvas**: MIT License
- **Material Design Icons**: Apache License 2.0
- **TypeScript**: Apache License 2.0
- **Webpack**: MIT License
- **Jest**: MIT License

---

## 📞 İletişim ve Destek

### Bug Bildirimi
GitHub Issues üzerinden bug bildirimi yapabilirsiniz:
1. Detaylı açıklama
2. Reproduksiyon adımları
3. Beklenen vs gerçek davranış
4. Screenshot/video (varsa)
5. Browser ve uzantı versiyonu

### Feature Requests
Yeni özellik önerileri için:
1. Use case açıklaması
2. Benzer çözümlerle karşılaştırma
3. Mockup/wireframe (varsa)
4. Implementation önerileri

### Güvenlik
Güvenlik açıkları için: [security@example.com](mailto:security@example.com)

---

**Ekşi Artı** ile Ekşi Sözlük deneyiminizi bir üst seviyeye taşıyın! 🚀

*Bu proje Ekşi Sözlük ile resmi bir bağlantısı bulunmamaktadır ve tamamen bağımsız bir topluluk projesidir.*