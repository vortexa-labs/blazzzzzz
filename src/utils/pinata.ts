import axios from 'axios';

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  console.warn('Pinata API keys not found in environment variables');
}

export const uploadImageToPinata = async (file: File): Promise<string> => {
  try {
    console.log('Starting Pinata upload...');
    console.log('API Keys present:', {
      hasApiKey: !!PINATA_API_KEY,
      hasSecretKey: !!PINATA_SECRET_KEY
    });

    const formData = new FormData();
    formData.append('file', file);

    console.log('Sending request to Pinata...');
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log('Pinata response:', response.data);
    const ipfsHash = response.data.IpfsHash;
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log('Generated IPFS URL:', url);
    return url;
  } catch (error: any) {
    console.error('Pinata upload error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    throw new Error('Failed to upload image to IPFS: ' + (error.response?.data?.error || error.message));
  }
}; 