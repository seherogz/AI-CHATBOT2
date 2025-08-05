const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Database ve middleware import
const { syncDatabase, User } = require('./models');
const { generateToken, authenticateToken, optionalAuth } = require('./middleware/auth');

const app = express();

// CORS Ayarları:CORS ayarları frontend ile iletişimi sağlar, 
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.options('*', cors());

app.use(express.json());


// --- LOGLAMA MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); //req.method: HTTP metodu (GET, POST, PUT, DELETE), gelen istekleri loglar.
  if (req.body && Object.keys(req.body).length > 0) { //eğer varsa body ieriğini gösterir.
    console.log('Request Body:', req.body);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası oluştu',
    error: err.message
  });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.json({ message: 'AI Chatbot API çalışıyor' }); //json formatında yanıt gönderir.
});

// --- AUTH ENDPOINTS ---

// Kullanıcı kaydı
app.post('/api/auth/register', async (req, res) => { //username, email, password kontrol edilir.Kullanıcı zaten varsa 400 dönerYeni kullanıcı oluşturulur (User.create)JWT token üretip döner
  try {
    const { username, email, password } = req.body; //bu bilgileri kullanıcı gönderiyor formdan.
    
    console.log('Register attempt:', { username, email });
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tüm alanlar zorunludur.' 
      });
    }
    
    const existingUser = await User.findOne({  // username veya emailiyle kullanıcı kontrol edilir.
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });
    
    if (existingUser) { //kullanıcı varsa 400 döner.
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kullanıcı adı veya email zaten kullanılıyor.' 
      });
    }
    
    // Yeni kullanıcı oluştur
    const user = await User.create({
      username,
      email,
      password
    });
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User registered successfully:', { id: user.id, username: user.username });
    
    res.status(201).json({ 
      success: true, 
      message: 'Kayıt başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kayıt sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı girişi
//Kullanıcının gönderdiği username ve password bilgilerine göre:
//Kullanıcının var olup olmadığını kontrol eder
//Şifresinin doğru olup olmadığını bcrypt ile kontrol eder
//Doğruysa JWT token oluşturup kullanıcıya döner
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body; //kullanıcının gönderdiği username ve password bilgileri alınır.
     
    console.log('Login attempt:', { username });
    
    if (!username || !password) { //username ve password zorunlu alanlar kontrol edilir. eksikse 400 döner.
      return res.status(400).json({ 
        success: false, 
        message: 'Kullanıcı adı ve şifre zorunludur.' 
      });
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ 
      where: { username: username }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // Şifre kontrolü
    const isValidPassword = await bcrypt.compare(password, user.password); //kullanıcının gönderdiği password (bcrypt) veritabanındaki hashlenmiş password ile karşılaştırılır.
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı adı veya şifre hatalı.' 
      });
    }
    
    // JWT token oluştur
    const token = generateToken(user);
    
    console.log('User logged in successfully:', { id: user.id, username: user.username });
    
    res.status(200).json({  //kullanıcı giriş yaptıktan sonra token oluşturulur ve kullanıcıya döner bu bilgiler.
      success: true, 
      message: 'Giriş başarılı.',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Giriş sırasında hata oluştu.' 
    });
  }
});

// Kullanıcı profili
app.get('/api/auth/profile', authenticateToken, async (req, res) => { //Bu sayede sadece giriş yapmış kullanıcılar profiline erişebilir.
  try {
    res.status(200).json({ 
      success: true,
      user: { //token geçerliyse veya kullanıcı bulunduysa bu bilgiler json formatında gözükür.
        id: req.user.id, //id bilgisi req.user.id'nin içine konur.
        username: req.user.username,
        email: req.user.email,
        preferredModel: req.user.preferredModel || 'openai/gpt-3.5-turbo',
        preferredLanguage: req.user.preferredLanguage || 'tr'
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({  //hatalıysa 500 döner.
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu.'
    });
  }
});

// Kullanıcı çıkışı
app.post('/api/auth/logout', authenticateToken, async (req, res) => { //Sadece token’ı olan (giriş yapmış) kullanıcı çıkış yapabilir.
  try {
    console.log('User logout:', { id: req.user.id, username: req.user.username });
    
    //  Önce token doğrulaması yapılır.Token doğruysa çıkış yapılır. Token doğru değilse 401 döner.
    res.status(200).json({ //token doğprulaması yapılır önce
      success: true,
      message: 'Çıkış başarılı.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış sırasında hata oluştu.'
    });
  }
});

// Kullanıcı tercihlerini güncelle
app.post('/api/user/preferences', authenticateToken, async (req, res) => { //Sadece token’ı olan (giriş yapmış) kullanıcı tercihlerini güncelleyebilir.
  try {
    const { model, language, hotel } = req.body;  //kullanıcının gönderdiği model ve language bilgileri alınır.
    
    console.log('Updating user preferences:', {  
      userId: req.user.id, 
      username: req.user.username, 
      model, 
      language,
      hotel
    });
    
    // Kullanıcı tercihlerini güncelle
    await User.update(
      { 
        preferredModel: model, 
        preferredLanguage: language 
      },
      { where: { id: req.user.id } } //Hangi kullanıcının tercihlerini güncelleyeceğini belirtir.
    );
    
    res.status(200).json({
      success: true,
      message: 'Tercihler güncellendi.',
      preferences: { model, language }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Tercihler güncellenirken hata oluştu.'
    });
  }
});

// --- OTELLER VERİSİ ---

// --- OTELLER API ENDPOINT'LERİ ---

// Tüm otelleri getir
app.get('/api/hotels', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      hotels: [] // Hotelleri boş bırakıyoruz
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Otel bilgileri alınırken hata oluştu.'
    });
  }
});

// Konuma göre otel ara
app.get('/api/hotels/search', (req, res) => {
  try {
    const { location, maxPrice, minPrice, stars } = req.query;
    
    let filteredHotels = [];
    
    // Konum filtresi
    if (location) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    // Fiyat filtresi
    if (maxPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price <= parseInt(maxPrice)
      );
    }
    
    if (minPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price >= parseInt(minPrice)
      );
    }
    
    // Yıldız filtresi
    if (stars) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.stars >= parseInt(stars)
      );
    }
    
    res.status(200).json({
      success: true,
      hotels: filteredHotels,
      count: filteredHotels.length
    });
  } catch (error) {
    console.error('Search hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Otel arama sırasında hata oluştu.'
    });
  }
});

// --- SUNUCUYU BAŞLATMA ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database'i senkronize et
    await syncDatabase();
    
    // Sunucuyu başlat
    app.listen(PORT, () => {
      console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer(); 