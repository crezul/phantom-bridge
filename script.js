let dirHandle = null;

async function chooseUSB() {
  try {
    dirHandle = await window.showDirectoryPicker(); // File System Access API для USB
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    for await (const entry of dirHandle.values()) {
      const li = document.createElement('li');
      li.textContent = entry.name;
      li.onclick = () => downloadFile(entry);
      fileList.appendChild(li);
    }
    console.log('USB connected');
  } catch (err) {
    console.error('USB Error:', err);
  }
}

async function uploadFile() {
  const input = document.getElementById('uploadInput');
  const file = input.files[0];
  if (!file || !dirHandle) return;
  try {
    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    console.log('File uploaded');
  } catch (err) {
    console.error('Upload error:', err);
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
  } catch (err) {
    console.error('Download error:', err);
  }
}

async function connectWacom() {
  try {
    const device = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x056a }] }); // Wacom
    await device.open();
    device.addEventListener('inputreport', (e) => {
      const pressure = e.data.getUint8(1); // Тиск
      console.log('Wacom Pressure:', pressure);
    });
  } catch (err) {
    console.error('Wacom Error:', err);
  }
}

async function connectPrinter() {
  try {
    const device = await navigator.usb.requestDevice({ filters: [] }); // USB-принтери
    await device.open();
    console.log('Printer connected:', device.productName);
  } catch (err) {
    console.error('Printer Error:', err);
  }
}

async function connectArduino() {
  try {
    const port = await navigator.serial.requestPort({}); // Arduino
    await port.open({ baudRate: 9600 });
    console.log('Arduino connected');
  } catch (err) {
    console.error('Arduino Error:', err);
  }
}
