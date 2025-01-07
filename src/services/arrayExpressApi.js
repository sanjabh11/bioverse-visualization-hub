// ... existing code ...
async searchExperiments(query) {
    const response = await fetch(`https://www.ebi.ac.uk/biostudies/arrayexpress/help#programmatic?query=${query}`);
    
    // Check if the response is OK (status in the range 200-299)
    if (!response.ok) {
        const errorText = await response.text(); // Get the response text for logging
        console.error('Error fetching data:', response.status, errorText);
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
    }

    try {
        const data = await response.json();
        return data; // Return the parsed JSON data
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        throw new Error('Invalid JSON response');
    }
}
// ... existing code ...