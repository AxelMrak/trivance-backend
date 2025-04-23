export function randomName(): string {
  const names = ["Axel", "Bruno", "Carla", "Diana", "Ezequiel", "Flor", "Gonzalo", "Helena"];
  return names[Math.floor(Math.random() * names.length)];
}

export function randomEmail(): string {
  const name = randomName().toLowerCase();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${name}${randomNum}@gmail.com`;
}

export function randomPhone(): string {
  const prefix = "+54911"; 
  const number = Math.floor(Math.random() * 90000000 + 10000000); 
  return `${prefix}${number}`;
}
