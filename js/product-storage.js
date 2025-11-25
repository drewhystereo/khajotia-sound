// Client-side product storage using GitHub Gist
// This bypasses serverless function issues completely

class ProductStorage {
  constructor() {
    this.gistId = 'your-gist-id'; // You'll need to create a gist
    this.githubToken = 'your-github-token'; // Store this securely
    this.fallbackToLocalStorage = true;
  }

  // Load products from GitHub Gist
  async loadProducts() {
    try {
      if (!this.gistId || this.gistId === 'your-gist-id') {
        return this.loadFromLocalStorage();
      }

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const gist = await response.json();
        const content = gist.files['products.json']?.content || '[]';
        const products = JSON.parse(content);
        
        // Update localStorage as backup
        localStorage.setItem('khajotia-products', JSON.stringify(products));
        return products;
      }
    } catch (error) {
      console.error('Gist load failed, using localStorage:', error);
    }

    return this.loadFromLocalStorage();
  }

  // Save products to GitHub Gist
  async saveProducts(products) {
    try {
      // Always save to localStorage first
      localStorage.setItem('khajotia-products', JSON.stringify(products));

      if (!this.gistId || this.gistId === 'your-gist-id' || !this.githubToken) {
        return products; // Only localStorage available
      }

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'products.json': {
              content: JSON.stringify(products, null, 2)
            }
          }
        })
      });

      if (response.ok) {
        return products;
      }
    } catch (error) {
      console.error('Gist save failed, using localStorage only:', error);
    }

    return products;
  }

  // Load from localStorage fallback
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('khajotia-products');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('LocalStorage load failed:', error);
      return [];
    }
  }

  // Add a new product
  async addProduct(productData) {
    const products = await this.loadProducts();
    
    const newProduct = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...productData,
      createdAt: new Date().toISOString(),
    };

    products.push(newProduct);
    await this.saveProducts(products);
    
    return newProduct;
  }

  // Update a product
  async updateProduct(productId, updateData) {
    const products = await this.loadProducts();
    const index = products.findIndex(p => p.id === productId);
    
    if (index !== -1) {
      products[index] = {
        ...products[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      await this.saveProducts(products);
      return products[index];
    }
    
    throw new Error('Product not found');
  }

  // Delete a product
  async deleteProduct(productId) {
    const products = await this.loadProducts();
    const filteredProducts = products.filter(p => p.id !== productId);
    
    if (products.length !== filteredProducts.length) {
      await this.saveProducts(filteredProducts);
      return true;
    }
    
    throw new Error('Product not found');
  }
}

// Global storage instance
const productStorage = new ProductStorage();

// Export for use in HTML files
if (typeof window !== 'undefined') {
  window.productStorage = productStorage;
}
