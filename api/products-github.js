// Simple API using GitHub Gist as storage
// This bypasses Vercel serverless issues

const GIST_ID = 'your-gist-id-here'; // You'll need to create a gist
const GIST_TOKEN = 'your-github-token'; // Store this securely

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to fetch from GitHub Gist
async function fetchGist() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GIST_TOKEN}`
      }
    });
    
    if (response.ok) {
      const gist = await response.json();
      const content = gist.files['products.json']?.content || '[]';
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error('Gist fetch error:', error);
    return [];
  }
}

// Helper to update GitHub Gist
async function updateGist(products) {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
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
    
    return response.ok;
  } catch (error) {
    console.error('Gist update error:', error);
    return false;
  }
}

// Handle CORS
function handleCors() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET /api/products
async function handleGet() {
  try {
    const products = await fetchGist();
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// POST /api/products
async function handlePost(request) {
  try {
    const productData = await request.json();
    
    if (!productData.name || !productData.price || !productData.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const newProduct = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...productData,
      createdAt: new Date().toISOString(),
    };

    const products = await fetchGist();
    const updatedProducts = [...products, newProduct];
    
    await updateGist(updatedProducts);
    
    return new Response(JSON.stringify(newProduct), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create product' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Main handler
export default async function handler(request) {
  const method = request.method;

  if (method === 'OPTIONS') {
    return handleCors();
  }

  switch (method) {
    case 'GET':
      return handleGet();
    case 'POST':
      return handlePost(request);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
}
