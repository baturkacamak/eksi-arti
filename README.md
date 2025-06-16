# Ekşi Artı

**Ekşi Artı**, Ekşi Sözlük deneyimini geliştiren gelişmiş bir Chrome uzantısıdır. Kullanıcı yönetimi ve içerik kontrolü için çeşitli araçlar sunar.

## 🌟 Özellikler

### Toplu Kullanıcı Engelleme
- Bir yazıyı favorileyen kullanıcıları kolayca toplu olarak engelleyebilir veya sessize alabilirsiniz
- Sessiz alma (yazılarını görürsünüz) veya tamamen engelleme seçenekleri
- Özel not ekleme imkanı

### Gelişmiş İşlem Kontrolü
- İşlemi istediğiniz anda duraklatabilir ve daha sonra devam ettirebilirsiniz
- Sunucu yükünü azaltmak için yerleşik gecikme koruması
- Detaylı ilerleme bildirimleri

### Ek Özellikler
- Giriş sayfası için özel arama
- Yazarları renklendirme ve not alma
- Yazıları ekran görüntüsü olarak kaydetme
- Hızlı kopyalama ve ekran görüntüsü alma düğmeleri
- Çöp kutusu yönetimi
- Yazı sıralama araçları

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

1. Herhangi bir Ekşi Sözlük yazı sayfasına gidin
2. Yazının "..." menüsüne tıklayın
3. "favorileyenleri engelle" seçeneğini seçin
4. Şunları yapabilirsiniz:
   - "Sessiz Al" - Kullanıcının yazılarını görmeye devam edin, bildirimlere dahil olmaz
   - "Engelle" - Kullanıcıyı tamamen engelleyin

## 🛠 Geliştirme

### Gereksinimler
- Node.js (v14+)
- npm veya yarn

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

## 🧪 Test
```bash
npm test
```

## 📂 Proje Yapısı
```
eksi-arti/
├── dist/             # Derlenmiş dosyalar
├── icons/            # Uzantı simgeleri
├── src/              # Kaynak kod
│   ├── components/   # UI bileşenleri
│   ├── services/     # Servis sınıfları
│   ├── content.ts    # İçerik betiği
│   ├── constants.ts  # Sabitler ve numaralandırmalar
│   └── types.ts      # TypeScript arayüzleri
├── tests/            # Test dosyaları
├── manifest.json     # Uzantı manifestosu
└── package.json      # Proje bağımlılıkları
```

## 📋 Katkıda Bulunma
1. Projeyi forklayın
2. Kendi branch'ınızı oluşturun (`git checkout -b ozellik/harika-eklenti`)
3. Değişikliklerinizi commit edin (`git commit -m 'Harika bir özellik ekledim'`)
4. Branch'ınıza push yapın (`git push origin ozellik/harika-eklenti`)
5. Bir Pull Request açın

## 📄 Lisans
MIT Lisansı altında yayımlanmıştır. Detaylar için LICENSE dosyasına bakın.

## ⚠️ Sorumluluk Reddi
Bu uzantı Ekşi Sözlük ile resmi olarak ilişkili değildir. Kullanırken site kurallarına ve görgü kurallarına özen gösterin.