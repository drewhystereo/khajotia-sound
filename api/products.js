// Vercel serverless function for managing products
// This will be deployed as /api/products

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// In-memory storage as fallback
let memoryProducts = [];

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
    return new Response(JSON.stringify(memoryProducts), {
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

    // Add to memory storage
    memoryProducts.push(newProduct);
    
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

    // Find and update the product
    const productIndex = memoryProducts.findIndex(p => p.id === productData.id);
    
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
      ...memoryProducts[productIndex],
      ...productData,
      updatedAt: new Date().toISOString(),
    };

    memoryProducts[productIndex] = updatedProduct;
    
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

    // Filter out the product to delete
    const filteredProducts = memoryProducts.filter(p => p.id !== productId);
    
    if (memoryProducts.length === filteredProducts.length) {
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

    memoryProducts = filteredProducts;
    
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
