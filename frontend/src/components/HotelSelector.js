import React from 'react';
import './HotelSelector.css';

const HotelSelector = ({ selectedHotel, onHotelChange, disabled = false, compact = false }) => {  //onhotelchange otel değiştiğinde çağrılan fonksyion.,disable seçim devre dışı olup olmadığını kontrol eder.
  //Çünkü otel nesnesi bulunup dışarı gönderiliyor  yani üst komponent bu otel nesnesini alıyor ve duruma göre güncelleniyor..ama language için gerek yok zaten dil kodu direkt gönderiliyor.
  //“Hangi otel seçildi?” sorusuna cevap verir. App.js'e "şu otel seçildi" der. Bu ise oteli kaydeder ve sunucuya yollar.
  const hotels = [
    {
      id: 'none',
      name: 'Otel Seçiniz',
      description: 'Genel sorular için'
    },
    {
      id: 'hilton',
      name: 'Hilton Hotels',
      description: 'Lüks konaklama deneyimi',
      prompt: 'Sen Hilton Hotels\'in müşteri hizmetleri temsilcisisin. Lüks konaklama deneyimi sunan Hilton otellerimiz hakkında bilgi veriyorsun. Rezervasyon, özellikler, hizmetler ve özel talepler konusunda yardımcı oluyorsun.'
    },
    {
      id: 'marriott',
      name: 'Marriott International',
      description: 'Uluslararası otel zinciri',
      prompt: 'Sen Marriott International\'ın müşteri hizmetleri temsilcisisin. Dünya çapında otellerimiz hakkında bilgi veriyorsun. Rezervasyon, özel programlar, sadakat kartları ve konaklama seçenekleri konusunda yardımcı oluyorsun.'
    },
    {
      id: 'accor',
      name: 'Accor Hotels',
      description: 'Avrupa\'nın önde gelen otel grubu',
      prompt: 'Sen Accor Hotels\'in müşteri hizmetleri temsilcisisin. Avrupa\'nın önde gelen otel grubumuz hakkında bilgi veriyorsun. Sofitel, Novotel, Ibis gibi markalarımız ve özel hizmetlerimiz konusunda yardımcı oluyorsun.'
    },
    {
      id: 'hyatt',
      name: 'Hyatt Hotels',
      description: 'Premium otel deneyimi',
      prompt: 'Sen Hyatt Hotels\'in müşteri hizmetleri temsilcisisin. Premium otel deneyimi sunan Hyatt otellerimiz hakkında bilgi veriyorsun. Park Hyatt, Grand Hyatt, Andaz gibi markalarımız ve özel hizmetlerimiz konusunda yardımcı oluyorsun.'
    },
    {
      id: 'ritz-carlton',
      name: 'The Ritz-Carlton',
      description: 'Ultra lüks konaklama',
      prompt: 'Sen The Ritz-Carlton\'ın müşteri hizmetleri temsilcisisin. Ultra lüks konaklama deneyimi sunan Ritz-Carlton otellerimiz hakkında bilgi veriyorsun. "Ladies and Gentlemen serving Ladies and Gentlemen" felsefemiz ve özel hizmetlerimiz konusunda yardımcı oluyorsun.'
    },
    {
      id: 'four-seasons',
      name: 'Four Seasons Hotels',
      description: 'Dünya standartlarında lüks',
      prompt: 'Sen Four Seasons Hotels\'in müşteri hizmetleri temsilcisisin. Dünya standartlarında lüks konaklama deneyimi sunan Four Seasons otellerimiz hakkında bilgi veriyorsun. Özel hizmetler, spa, restoranlar ve konaklama seçenekleri konusunda yardımcı oluyorsun.'
    },
    {
      id: 'w-hotels',
      name: 'W Hotels',
      description: 'Tasarım odaklı yaşam tarzı',
      prompt: 'Sen W Hotels\'in müşteri hizmetleri temsilcisisin. Tasarım odaklı yaşam tarzı otellerimiz hakkında bilgi veriyorsun. Modern tasarım, canlı atmosfer, özel etkinlikler ve konaklama deneyimi konusunda yardımcı oluyorsun.'
    },
    {
      id: 'sheraton',
      name: 'Sheraton Hotels',
      description: 'Güvenilir konfor',
      prompt: 'Sen Sheraton Hotels\'in müşteri hizmetleri temsilcisisin. Güvenilir konfor sunan Sheraton otellerimiz hakkında bilgi veriyorsun. İş seyahatleri, aile tatilleri ve özel etkinlikler için konaklama seçenekleri konusunda yardımcı oluyorsun.'
    },
    {
      id: 'holiday-inn',
      name: 'Holiday Inn',
      description: 'Aile dostu konaklama',
      prompt: 'Sen Holiday Inn\'in müşteri hizmetleri temsilcisisin. Aile dostu konaklama deneyimi sunan Holiday Inn otellerimiz hakkında bilgi veriyorsun. Aile tatilleri, iş seyahatleri ve uygun fiyatlı konaklama seçenekleri konusunda yardımcı oluyorsun.'
    }
  ];

  const handleHotelChange = (e) => {
    const hotelId = e.target.value;//kullanıcının seçtiği otelin id değerini alır kullanıcıdan alınır.
    const selectedHotelData = hotels.find(hotel => hotel.id === hotelId); //hotels dizisi içinde seçilen id ile eşleşen otel nesnesi bulunur.
    onHotelChange(selectedHotelData); //bu parametreyi gönderir. Bu sayede üst komponent hangi otelin seçildiğini bilir ve duruma göre güncellenir.
    
    // Otel seçildiğinde kullanıcıya bilgi ver
    if (selectedHotelData && selectedHotelData.id !== 'none') {
      console.log(`Otel seçildi: ${selectedHotelData.name} - AI artık bu otelin temsilcisi olarak yanıt verecek`);
    }
  };

  if (compact) {
    return (
      <div className="hotel-selector-compact">
        <select
          value={selectedHotel?.id || 'none'}
          onChange={handleHotelChange}
          disabled={disabled}
          className="hotel-select-compact"
        >
          {hotels.map(hotel => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="hotel-selector">
      <label className="hotel-selector-label">
        <span className="hotel-selector-title">🏨 Otel Seçimi</span>
        <select
          value={selectedHotel?.id || 'none'}
          onChange={handleHotelChange}
          disabled={disabled}
          className="hotel-select"
        >
          {hotels.map(hotel => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name} - {hotel.description}
            </option>
          ))}
        </select>
      </label>
      {selectedHotel && selectedHotel.id !== 'none' && (
        <div className="selected-hotel-info">
          <strong>{selectedHotel.name}</strong>
          <p>{selectedHotel.description}</p>
        </div>
      )}
    </div>
  );
};

export default HotelSelector; 