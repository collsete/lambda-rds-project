// index.js
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
};
exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  let connection;
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    connection = await mysql.createConnection(dbConfig);

    let response;

    switch (event.httpMethod) {
      case 'GET':
        if (event.pathParameters && event.pathParameters.id) {
          const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [event.pathParameters.id]);
          response = rows[0];
        } else {
          const [rows] = await connection.execute('SELECT * FROM users');
          response = rows;
        }
        break;

      case 'POST':
        const postData = JSON.parse(event.body!);
        await connection.execute('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [postData.id, postData.name, postData.email]);
        response = { message: 'User created' };
        break;

      case 'PUT':
        const putData = JSON.parse(event.body!);
        await connection.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [putData.name, putData.email, putData.id]);
        response = { message: 'User updated' };
        break;

      case 'DELETE':
        if (event.pathParameters && event.pathParameters.id) {
          const { id } = event.pathParameters;
          await connection.execute('DELETE FROM users WHERE id = ?', [id]);
          response = { message: 'User deleted' };
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing id parameter' }),
          };
        }
        response = { message: 'User deleted' };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Unsupported route' }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: (error as Error).message }),
    };
  } finally {
    if (connection) await connection.end();
  }
};
