export async function generateSafezone(
    polygonData
) {
    const response = await fetch(
        "http://127.0.0.1:8000/generate-safezone",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify(
                polygonData
            ),
        }
    );

    if (!response.ok) {
        throw new Error(
            "Failed to generate safezone"
        );
    }

    return response.json();
}