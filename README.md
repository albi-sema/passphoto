# Passphoto

Passphoto is an application that allows users to generate biometric photos from standard portrait photos. This app uses advanced image processing to convert your portrait into an approved biometric photo—perfect for passports and official IDs.

## Features

- **Upload & Preview:** Upload your portrait and preview both the original and the processed biometric photo.
- **Adjust Mask Size:** Fine-tune processing settings such as mask size.
- **Download Photos:** Easily download both the original and biometric photos.
- **Full-Stack:** A Flask backend handles image processing, while the Next.js frontend provides a modern UI.

## Repository Structure

```
passphoto/
├── backend/           # Flask backend
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/          # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       └── page.tsx
│   ├── package.json
│   └── ...
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

## Installation

### Backend

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask app:
   ```bash
   python app.py
   ```

### Frontend

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details. 