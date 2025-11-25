// Vercel serverless function for managing products
// This will be deployed as /api/products
// Uses JSON file storage for simplicity and no cost

import fs from 'fs';
import path from 'path';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Path to products JSON file
const productsFilePath = path.join(process.cwd(), 'data', 'products.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read products from JSON file
function readProducts() {
  try {
    ensureDataDir();
    if (fs.existsSync(productsFilePath)) {
      const data = fs.readFileSync(productsFilePath, 'utf8');
      return JSON.parse(data);
    }
    // Create empty products file if it doesn't exist
    fs.writeFileSync(productsFilePath, JSON.stringify([], null, 2));
    return [];
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

// Write products to JSON file
function writeProducts(products) {
  try {
    ensureDataDir();
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing products:', error);
    return false;
  }
}

// Handle CORS preflight requests
function handleCors() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET /api/products - Fetch all products
async function handleGet() {
  try {
    const products = readProducts();
    
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// POST /api/products - Create a new product
async function handlePost(request) {
  try {
    const productData = await request.json();
    
    // Validate required fields
    if (!productData.name || !productData.price || !productData.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, price, description' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Generate unique ID and timestamp
    const newProduct = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...productData,
      createdAt: new Date().toISOString(),
    };

    // Get existing products
    const existingProducts = readProducts();
    
    // Add new product
    const updatedProducts = [...existingProducts, newProduct];
    
    // Save to file
    const success = writeProducts(updatedProducts);
    
    if (!success) {
      throw new Error('Failed to save product');
    }
    
    return new Response(JSON.stringify(newProduct), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ error: 'Failed to create product' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// PUT /api/products - Update a product
async function handlePut(request) {
  try {
    const productData = await request.json();
    
    if (!productData.id) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get existing products
    const existingProducts = readProducts();
    
    // Find and update the product
    const productIndex = existingProducts.findIndex(p => p.id === productData.id);
    
    if (productIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Update product with new data
    const updatedProduct = {
      ...existingProducts[productIndex],
      ...productData,
      updatedAt: new Date().toISOString(),
    };

    existingProducts[productIndex] = updatedProduct;
    
    // Save to file
    const success = writeProducts(existingProducts);
    
    if (!success) {
      throw new Error('Failed to update product');
    }
    
    return new Response(JSON.stringify(updatedProduct), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return new Response(JSON.stringify({ error: 'Failed to update product' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// DELETE /api/products - Delete a product
async function handleDelete(request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('id');
    
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get existing products
    const existingProducts = readProducts();
    
    // Filter out the product to delete
    const filteredProducts = existingProducts.filter(p => p.id !== productId);
    
    if (existingProducts.length === filteredProducts.length) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Save to file
    const success = writeProducts(filteredProducts);
    
    if (!success) {
      throw new Error('Failed to delete product');
    }
    
    return new Response(JSON.stringify({ message: 'Product deleted successfully' }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete product' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Main handler for Vercel
export default async function handler(request) {
  const url = new URL(request.url);
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCors();
  }

  // Route to appropriate handler
  switch (method) {
    case 'GET':
      return handleGet();
    case 'POST':
      return handlePost(request);
    case 'PUT':
      return handlePut(request);
    case 'DELETE':
      return handleDelete(request);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
  }
}
