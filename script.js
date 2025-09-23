let dirHandle = null;

async function chooseUSB() {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); // File System Access API
    const fileList = document.getElementById('fileList');
    const errorDiv = document.getElementById('error');
    fileList.innerHTML = '';
    errorDiv.textContent = '';
    for await (const entry of dirHandle.values()) {
      const li = document.createElement('li');
      li.textContent = entry.name;
      li.onclick = () => downloadFile(entry);
      fileList.appendChild(li);
    }
    console.log('USB connected');
  } catch (err) {
    console.error('USB Error:', err);
    document.getElementById('error').textContent = 'Error connect to USB: ' + err.message;
  }
}

async function uploadFile(event) {
  const input = event.target; 
  const file = input.files[0];
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';

  if (!file) {
    errorDiv.textContent = 'Виберіть файл для завантаження';
    return;
  }
  if (!dirHandle) {
    errorDiv.textContent = 'Спочатку підключіть USB-пристрій';
    return;
  }

  try {
    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    console.log('File uploaded:', file.name);
    errorDiv.textContent = 'Файл завантажено: ' + file.name;
  
    chooseUSB();
  } catch (err) {
    console.error('Upload error:', err);
    errorDiv.textContent = 'Помилка завантаження: ' + err.message;
  }
}

async function downloadFile(entry) {
  if (entry.kind !== 'file') return;
  try {
    const file = await entry.getFile();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = entry.name;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log('File downloaded:', entry.name);
  } catch (err) {
    console.error('Download error:', err);
    document.getElementById('error').textContent = 'Помилка завантаження: ' + err.message;
  }
}


async function connectWacom() {
  try {
    const device = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x056a }] });
    await device.open();
    device.addEventListener('inputreport', (e) => {
      const pressure = e.data.getUint8(1);
      console.log('Wacom Pressure:', pressure);
    });
  } catch (err) {
    console.error('Wacom Error:', err);
    document.getElementById('error').textContent = 'Помилка Wacom: ' + err.message;
  }
}

async function connectPrinter() {
  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    await device.open();
    console.log('Printer connected:', device.productName);
  } catch (err) {
    console.error('Printer Error:', err);
    document.getElementById('error').textContent = 'Помилка принтера: ' + err.message;
  }
}

async function connectArduino() {
  try {
    const port = await navigator.serial.requestPort({});
    await port.open({ baudRate: 9600 });
    console.log('Arduino connected');
  } catch (err) {
    console.error('Arduino Error:', err);
    document.getElementById('error').textContent = 'Помилка Arduino: ' + err.message;
  }
}
