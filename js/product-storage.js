// Image upload utility
class ImageUploader {
  constructor(apiKey = 'e3c0c4d4f32ea57bc44757f209c05973') { // Using a public demo key, replace with your own
    this.apiKey = apiKey;
    this.uploadUrl = 'https://api.imgbb.com/1/upload';
  }

  // Upload image file to ImgBB
  async uploadImage(file) {
    if (!file) throw new Error('No file provided');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`${this.uploadUrl}?key=${this.apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
      
      return {
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        thumbUrl: data.data.thumb?.url || data.data.url,
        mediumUrl: data.data.medium?.url || data.data.url
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }
}

// JSONBin.io storage for products
class ProductStorage {
  constructor() {
    // JSONBin.io configuration
    this.binId = '694c22ad43b1c97be902fe79'; // Your bin ID
    this.masterKey = '$2a$10$iltNj5QUuDlY1SqLA3nyOOHHmTSLOM5vOWFa7lXigHekaeqEUCtZK';
    this.accessKey = '$2a$10$ES9on.WKNP5DHsizP4tt4Oet9OgZTLTZPJfKxN2T.vfhmc2Cm57Qq';
    this.baseUrl = 'https://api.jsonbin.io/v3/b';
    this.useLocalStorage = false;
    
    // Image configuration
    this.allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    this.maxImageSizeMB = 5; // 5MB max file size
    this.maxImageUrlLength = 500; // Reasonable limit for image URLs
    
    // Initialize image uploader
    this.imageUploader = new ImageUploader();
    
    // Initialize headers
    this._updateHeaders();
  }
  
  // Update headers with current credentials
  _updateHeaders() {
    this.headers = {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterKey,
      'X-Access-Key': this.accessKey,
      'X-Bin-Name': 'Khajotia Sound Products',
      'X-Bin-Private': 'false'
    };
  }

  // Helper method to handle API requests
  async _makeRequest(endpoint, method = 'GET', data = null) {
    // Create a fresh headers object for each request
    const headers = {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterKey,
      'X-Access-Key': this.accessKey,
      'X-Bin-Name': 'Khajotia Sound Products',
      'X-Bin-Private': 'false'
    };

    // Construct full URL
    const url = `${this.baseUrl}/${this.binId}${endpoint || ''}`;
    
    const options = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };

    console.log(`Making ${method} request to:`, url);
    console.log('Request headers:', headers);
    if (data) console.log('Request data:', data);

    try {
      const response = await fetch(url, options);
      
      // Handle empty responses (like 204 No Content)
      if (response.status === 204) {
        return null;
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', responseData);
        const errorMessage = responseData.message || 
                           (responseData.error ? responseData.error.message : 'Unknown error');
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
      }
      
      console.log('API Response:', responseData);
      return responseData;
      
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Load all products
  async loadProducts() {
    try {
      console.log('Loading products from JSONBin.io...');
      const data = await this._makeRequest('/latest');
      
      // Handle the response format for JSONBin.io v3
      const products = data?.record?.products || [];
      
      // Ensure we have an array
      if (!Array.isArray(products)) {
        console.warn('Invalid data format from JSONBin.io, initializing empty products array');
        return [];
      }
      
      console.log(`Loaded ${products.length} products from JSONBin.io`);
      
      // Update localStorage as backup (with full data)
      localStorage.setItem('khajotia-products', JSON.stringify(products));
      
      return products;
      
    } catch (error) {
      console.error('JSONBin load failed, falling back to localStorage:', error);
      this.useLocalStorage = true;
      
      try {
        const localProducts = await this.loadFromLocalStorage();
        console.log(`Loaded ${localProducts.length} products from localStorage`);
        return localProducts;
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
        return [];
      }
    }
  }

  // Validate image URL
  _isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Check URL format and length
    try {
      const urlObj = new URL(url);
      const extension = urlObj.pathname.split('.').pop()?.toLowerCase();
      
      // Check if the URL points to an image with allowed extension
      const isImageUrl = this.allowedImageExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith('.' + ext)
      );
      
      if (!isImageUrl) {
        console.warn('URL does not point to a valid image file:', url);
        return false;
      }
      
      if (url.length > this.maxImageUrlLength) {
        console.warn('Image URL is too long:', url.length, 'characters');
        return false;
      }
      
      return true;
      
    } catch (e) {
      console.warn('Invalid image URL:', url, e);
      return false;
    }
  }

  // Optimize product data before saving
  _optimizeProductData(products) {
    return products.map(product => {
      // Create a new object with only necessary fields
      const optimized = {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        features: product.features || [],
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Only include valid image URLs
      if (this._isValidImageUrl(product.imageUrl)) {
        optimized.imageUrl = product.imageUrl;
      } else if (product.imageUrl) {
        console.warn('Invalid image URL removed from product:', product.id, product.imageUrl);
      }

      return optimized;
    });
  }

  // Check if data is under size limit
  _isUnderSizeLimit(data) {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    const sizeInKB = sizeInBytes / 1024;
    console.log(`Data size: ${sizeInKB.toFixed(2)}KB`);
    return sizeInKB < 90; // Keep some buffer under 100KB
  }

  // Save all products
  async saveProducts(products) {
    if (!Array.isArray(products)) {
      throw new Error('Products must be an array');
    }

    // Optimize the data
    const optimizedProducts = this._optimizeProductData(products);
    const dataToSave = { products: optimizedProducts };

    // Check data size
    if (!this._isUnderSizeLimit(dataToSave)) {
      console.warn('Data size is approaching the limit. Consider removing some products or optimizing images.');
      
      // Try to remove image data to reduce size
      const minimalProducts = optimizedProducts.map(({ id, name, price }) => ({ id, name, price }));
      if (this._isUnderSizeLimit({ products: minimalProducts })) {
        dataToSave.products = minimalProducts;
        console.warn('Removed non-essential fields to reduce data size');
      } else {
        throw new Error('Data size exceeds JSONBin.io free tier limit. Please remove some products or upgrade your plan.');
      }
    }

    try {
      console.log('Saving products to JSONBin.io...');
      // Save to JSONBin.io - using empty endpoint since base URL is constructed in _makeRequest
      await this._makeRequest('', 'PUT', dataToSave);
      
      // Also update localStorage as backup
      localStorage.setItem('khajotia-products', JSON.stringify(products));
      console.log('Products saved successfully');
      return products;
      
    } catch (error) {
      console.error('JSONBin save failed, falling back to localStorage:', error);
      this.useLocalStorage = true;
      return this.saveToLocalStorage(products);
    }
  }

  // Handle image file upload
  async uploadProductImage(file) {
    if (!file) return '';
    
    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!this.allowedImageExtensions.includes(fileExt)) {
      throw new Error(`Invalid file type. Please upload one of: ${this.allowedImageExtensions.join(', ')}`);
    }
    
    // Validate file size (5MB max)
    if (file.size > this.maxImageSizeMB * 1024 * 1024) {
      throw new Error(`Image is too large. Maximum size is ${this.maxImageSizeMB}MB`);
    }
    
    try {
      console.log('Uploading image...');
      const result = await this.imageUploader.uploadImage(file);
      console.log('Image uploaded successfully:', result.url);
      return result.url; // Return the direct image URL
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  // Add a new product
  async addProduct(productData) {
    // Validate required fields
    if (!productData.name || !productData.price) {
      throw new Error('Product name and price are required');
    }
    
    // Handle image upload if a file is provided
    let imageUrl = productData.imageUrl || '';
    if (productData.imageFile) {
      imageUrl = await this.uploadProductImage(productData.imageFile);
    } else if (productData.imageUrl && !this._isValidImageUrl(productData.imageUrl)) {
      throw new Error('Please provide a valid image URL (jpg, jpeg, png, or webp)');
    }
    
    const products = await this.loadProducts();
    const newProduct = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: productData.name.trim(),
      price: productData.price,
      description: productData.description?.trim() || '',
      features: Array.isArray(productData.features) ? productData.features : [],
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    await this.saveProducts(products);
    
    console.log('Product added successfully:', newProduct.id);
    return newProduct;
  }

  // Update a product
  async updateProduct(productId, updateData) {
    const products = await this.loadProducts();
    const index = products.findIndex(p => p.id === productId);
    
    if (index === -1) {
      throw new Error('Product not found');
    }

    products[index] = {
      ...products[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await this.saveProducts(products);
    return products[index];
  }

  // Delete a product
  async deleteProduct(productId) {
    const products = await this.loadProducts();
    const filteredProducts = products.filter(p => p.id !== productId);
    
    if (products.length === filteredProducts.length) {
      throw new Error('Product not found');
    }

    await this.saveProducts(filteredProducts);
    return true;
  }

  // Fallback to localStorage methods
  async loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('khajotia-products');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('LocalStorage load failed:', error);
      return [];
    }
  }

  async saveToLocalStorage(products) {
    try {
      localStorage.setItem('khajotia-products', JSON.stringify(products));
      return products;
    } catch (error) {
      console.error('LocalStorage save failed:', error);
      throw error;
    }
  }
}

// Initialize
const productStorage = new ProductStorage();

// Make available globally
if (typeof window !== 'undefined') {
    window.productStorage = productStorage;
    console.log('ProductStorage initialized and available as window.productStorage');
}

// Log initialization
console.log('ProductStorage module loaded');
