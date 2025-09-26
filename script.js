let dirHandle = null;
let penDevice = null;
let isDrawing = false;

function checkAPISupport(apiName) {
  const errorDiv = document.getElementById('error');
  switch (apiName) {
    case 'fileSystem':
      if (!window.showDirectoryPicker) {
        errorDiv.textContent = 'File System Access API не підтримується';
        errorDiv.classList.add('show');
        return false;
      }
      break;
    case 'webhid':
      if (!navigator.hid) {
        errorDiv.textContent = 'WebHID API не підтримується';
        errorDiv.classList.add('show');
        return false;
      }
      break;
    case 'webusb':
      if (!navigator.usb) {
        errorDiv.textContent = 'WebUSB API не підтримується';
        errorDiv.classList.add('show');
        return false;
      }
      break;
    case 'webserial':
      if (!navigator.serial) {
        errorDiv.textContent = 'WebSerial API не підтримується';
        errorDiv.classList.add('show');
        return false;
      }
      break;
  }
  return true;
}

async function chooseUSB() {
  if (!checkAPISupport('fileSystem')) return;
  try {
    console.log('Starting USB connection...');
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    console.log('USB directory selected:', dirHandle.name);
    const fileList = document.getElementById('fileList');
    const errorDiv = document.getElementById('error');
    fileList.innerHTML = '';
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    for await (const entry of dirHandle.values()) {
      const li = document.createElement('li');
      li.textContent = entry.name;
      li.onclick = () => downloadFile(entry);
      fileList.appendChild(li);
    }
    console.log('USB files listed successfully');
    errorDiv.textContent = 'USB підключено: ' + dirHandle.name;
    errorDiv.classList.add('show');
  } catch (err) {
    console.error('USB Error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    document.getElementById('error').textContent = 'Помилка USB: ' + err.name + ' - ' + err.message;
    document.getElementById('error').classList.add('show');
  }
}

async function uploadFile(event) {
  if (!checkAPISupport('fileSystem')) return;
  const input = event.target;
  const file = input.files[0];
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');

  console.log('Starting upload... File:', file ? file.name : 'none');
  if (!file) {
    errorDiv.textContent = 'Виберіть файл для завантаження';
    errorDiv.classList.add('show');
    return;
  }
  if (!dirHandle) {
    errorDiv.textContent = 'Спочатку підключіть USB-пристрій';
    errorDiv.classList.add('show');
    return;
  }

  try {
    console.log('Creating file handle for:', file.name);
    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
    console.log('File handle created');
    const writable = await fileHandle.createWritable();
    console.log('Writable stream created');
    await writable.write(file);
    await writable.close();
    console.log('File uploaded successfully:', file.name);
    errorDiv.textContent = 'Файл завантажено: ' + file.name;
    errorDiv.classList.add('show');
    chooseUSB();
  } catch (err) {
    console.error('Upload error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    errorDiv.textContent = 'Помилка завантаження: ' + err.name + ' - ' + err.message;
    errorDiv.classList.add('show');
  }
}

async function downloadFile(entry) {
  if (!checkAPISupport('fileSystem')) return;
  if (entry.kind !== 'file') return;
  try {
    console.log('Starting download for:', entry.name);
    const file = await entry.getFile();
    console.log('File retrieved:', file.name, file.size);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = entry.name;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log('File downloaded successfully:', entry.name);
  } catch (err) {
    console.error('Download error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    document.getElementById('error').textContent = 'Помилка завантаження: ' + err.name + ' - ' + err.message;
    document.getElementById('error').classList.add('show');
  }
}

async function connectWacom() {
  if (!checkAPISupport('webhid')) return;
  try {
    console.log('Starting Wacom connection...');
    const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x056a }] });
    penDevice = devices[0];
    if (!penDevice) {
      throw new Error('Wacom не знайдено');
    }
    console.log('Wacom device found:', penDevice.productName);
    await penDevice.open();
    console.log('Wacom opened successfully');
    document.getElementById('penData').textContent = `Wacom: ${penDevice.productName} connected`;

    const canvas = document.getElementById('penCanvas');
    canvas.width = canvas.offsetWidth;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Не вдалося ініціалізувати canvas');
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#333';

    canvas.addEventListener('mousedown', () => { isDrawing = true; });
    canvas.addEventListener('mouseup', () => { isDrawing = false; ctx.beginPath(); });
    canvas.addEventListener('mousemove', (e) => {
      if (isDrawing) {
        ctx.lineWidth = 2;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
      }
    });

    penDevice.addEventListener('inputreport', (e) => {
      try {
        const data = e.data;
        const pressure = data.getUint16(2, true) || 0;
        const tiltX = data.getInt16(6, true) || 0;
        const tiltY = data.getInt16(8, true) || 0;
        const x = data.getUint16(10, true) || 0;
        const y = data.getUint16(12, true) || 0;
        document.getElementById('penData').textContent = `Pressure: ${pressure}, Tilt X: ${tiltX}, Tilt Y: ${tiltY}, X: ${x}, Y: ${y}`;
        console.log(`Wacom Data - Pressure: ${pressure}, Tilt X: ${tiltX}, Tilt Y: ${tiltY}, X: ${x}, Y: ${y}`);

        if (isDrawing) {
          ctx.lineWidth = Math.max(1, pressure / 200);
          ctx.lineTo(x / 10, y / 10);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x / 10, y / 10);
        }
      } catch (err) {
        console.error('Wacom inputreport error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
        document.getElementById('error').textContent = 'Помилка обробки Wacom: ' + err.message;
        document.getElementById('error').classList.add('show');
      }
    });
  } catch (err) {
    console.error('Wacom Error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    document.getElementById('error').textContent = 'Помилка Wacom: ' + err.name + ' - ' + err.message;
    document.getElementById('error').classList.add('show');
  }
}

function clearCanvas() {
  const canvas = document.getElementById('penCanvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('error').textContent = 'Canvas очищено';
    document.getElementById('error').classList.add('show');
  }
}

// Connect to a 3D printer and send test G-code
async function connectPrinter() {
  if (!checkAPISupport('webusb')) return;
  let device = null;
  try {
    // Log connection attempt
    console.log('Starting printer connection...');
    console.log('WebUSB API availability:', !!navigator.usb);

    // Request USB device (printer)
    device = await navigator.usb.requestDevice({ filters: [] });
    console.log('Printer device requested:', device.productName);

    // Log all device properties
    console.log('Device Properties:');
    Object.getOwnPropertyNames(device).forEach(prop => {
      try {
        const value = device[prop];
        console.log(`  ${prop}:`, typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : value);
      } catch (err) {
        console.warn(`Failed to access device property ${prop}:`, err.message);
      }
    });

    // Open the device
    await device.open();
    console.log('Printer opened successfully');

    // Select configuration (usually the first one)
    if (!device.configuration) {
      await device.selectConfiguration(1);
      console.log('Configuration selected:', device.configurationValue);
    }

    // Claim interface (typically interface 0 for 3D printers)
    await device.claimInterface(0);
    console.log('Interface 0 claimed');

    // Send test G-code (G28 to home all axes)
    const testGcode = 'G28\n'; // Home all axes
    const encoder = new TextEncoder();
    const data = encoder.encode(testGcode);
    console.log('Sending test G-code:', testGcode.trim());
    
    // Assume endpoint 1 is the output endpoint (common for USB CDC devices)
    await device.transferOut(1, data);
    console.log('Test G-code sent successfully');

    // Update UI with success
    document.getElementById('error').textContent = `Printer: ${device.productName} connected, G-code sent: ${testGcode.trim()}`;
    document.getElementById('error').classList.add('show');
  } catch (err) {
    console.error('Printer Error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    console.error('WebUSB API availability:', !!navigator.usb);
    document.getElementById('error').textContent = `Помилка принтера: ${err.name} - ${err.message}`;
    document.getElementById('error').classList.add('show');
  } finally {
    // Clean up: release interface and close device
    if (device && device.opened) {
      try {
        await device.releaseInterface(0);
        console.log('Interface 0 released');
        await device.close();
        console.log('Printer device closed');
      } catch (err) {
        console.warn('Failed to release/close device:', err.message);
        document.getElementById('error').textContent = `Помилка закриття принтера: ${err.message}`;
        document.getElementById('error').classList.add('show');
      }
    }
  }
}

async function connectArduino() {
  if (!checkAPISupport('webserial')) return;
  try {
    console.log('Starting Arduino connection...');
    const port = await navigator.serial.requestPort({});
    console.log('Arduino port opened:', port);
    await port.open({ baudRate: 9600 });
    console.log('Arduino connected');
    document.getElementById('error').textContent = 'Arduino connected';
    document.getElementById('error').classList.add('show');
  } catch (err) {
    console.error('Arduino Error - Name:', err.name, 'Message:', err.message, 'Stack:', err.stack);
    document.getElementById('error').textContent = 'Помилка Arduino: ' + err.name + ' - ' + err.message;
    document.getElementById('error').classList.add('show');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('PhantomBridge loaded');
  console.log('File System API support:', !!window.showDirectoryPicker);
  console.log('WebHID API support:', !!navigator.hid);
  console.log('WebUSB API support:', !!navigator.usb);
  console.log('WebSerial API support:', !!navigator.serial);
  if (!checkAPISupport('fileSystem') || !checkAPISupport('webhid') || !checkAPISupport('webusb') || !checkAPISupport('webserial')) {
    console.warn('Some APIs not supported');
  }
});
