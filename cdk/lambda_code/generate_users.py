import boto3
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize DynamoDB client
dynamodb = boto3.client('dynamodb')

# Constants
table_name = os.environ['DYNAMODB_TABLE_NAME']
total_users = 10000
batch_size = 25  # Adjust batch size as needed

# Function to generate DynamoDB items
def generate_items(start, end):
    items = []
    for i in range(start, end):
        items.append({
            'PutRequest': {
                'Item': {
                    'user_id': {'S': str(i)},
                    'metadata': {'M': {'first_name': {'S': 'John'}}}
                    # Add other attributes as needed
                }
            }
        })
    return items

# Function to batch items and write to DynamoDB
def write_to_dynamodb(items):
    params = {
        'RequestItems': {
            table_name: items
        }
    }
    while True:
        response = dynamodb.batch_write_item(**params)
        unprocessed_items = response.get('UnprocessedItems')
        if not unprocessed_items:
            break
        params['RequestItems'] = unprocessed_items
    return response

# Split users into batches and write to DynamoDB in parallel
def lambda_handler(event, context):
    batches = (total_users + batch_size - 1) // batch_size
    with ThreadPoolExecutor() as executor:
        futures = []
        for i in range(batches):
            start = i * batch_size
            end = min(start + batch_size, total_users)
            items = generate_items(start, end)
            futures.append(executor.submit(write_to_dynamodb, items))
        
        results = []
        try:
            for future in as_completed(futures):
                results.append(future.result())
            return {'statusCode': 200, 'body': "Items successfully written to DynamoDB"}
        except Exception as error:
            print("Error writing items to DynamoDB:", error)
            return {'statusCode': 500, 'body': "Error writing items to DynamoDB"}

