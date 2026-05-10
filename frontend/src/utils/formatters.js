export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('LKR', 'Rs.');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  // Basic formatter for Sri Lankan numbers +94 XX XXX XXXX
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(94|0)?(\d{2})(\d{3})(\d{4})$/);
  if (match) {
    return `+94 ${match[2]} ${match[3]} ${match[4]}`;
  }
  return phone;
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
};
