// JSONBin.io storage for products
class ProductStorage {
  constructor() {
    // JSONBin.io configuration
    this.binId = '694c22ad43b1c97be902fe79'; // Your bin ID
    this.masterKey = '$2a$10$iltNj5QUuDlY1SqLA3nyOOHHmTSLOM5vOWFa7lXigHekaeqEUCtZK';
    this.accessKey = '$2a$10$ES9on.WKNP5DHsizP4tt4Oet9OgZTLTZPJfKxN2T.vfhmc2Cm57Qq';
    this.baseUrl = 'https://api.jsonbin.io/v3/b';
    this.useLocalStorage = false;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterKey,
      'X-Access-Key': this.accessKey,
      'X-Bin-Name': 'Khajotia Sound Products',
      'X-Bin-Private': 'false'  // Make sure the bin is publicly readable
    };
  }

  // Helper method to handle API requests
  async _makeRequest(url, method = 'GET', data = null) {
    const options = {
      method,
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Load all products
  async loadProducts() {
    try {
      const data = await this._makeRequest(`${this.baseUrl}/${this.binId}/latest`);
      const binData = data.record || { products: [] };
      
      // Ensure we have the products array
      if (!Array.isArray(binData.products)) {
        binData.products = [];
      }
      
      // Update localStorage as backup
      localStorage.setItem('khajotia-products', JSON.stringify(binData.products));
      return binData.products;
      
    } catch (error) {
      console.error('JSONBin load failed, falling back to localStorage:', error);
      this.useLocalStorage = true;
      return this.loadFromLocalStorage();
    }
  }

  // Save all products
  async saveProducts(products) {
    if (!Array.isArray(products)) {
      throw new Error('Products must be an array');
    }

    try {
      await this._makeRequest(
        `${this.baseUrl}/${this.binId}`, 
        'PUT', 
        { products: products }  // Wrap products in an object
      );
      
      // Also update localStorage as backup
      localStorage.setItem('khajotia-products', JSON.stringify(products));
      return products;
      
    } catch (error) {
      console.error('JSONBin save failed, falling back to localStorage:', error);
      this.useLocalStorage = true;
      return this.saveToLocalStorage(products);
    }
  }

  // Add a new product
  async addProduct(productData) {
    const products = await this.loadProducts();
    const newProduct = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    await this.saveProducts(products);
    
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

// Initialize and export
const productStorage = new ProductStorage();

// Make available globally
if (typeof window !== 'undefined') {
  window.productStorage = productStorage;
}
