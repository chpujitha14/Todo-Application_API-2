const express = require("express");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const isMatch = require("date-fns/isMatch");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

//accept json data
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const convertTodoToJson = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};
const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
const priorityArray = ["HIGH", "MEDIUM", "LOW"];
const categoryArray = ["WORK", "HOME", "LEARNING"];
const formatDate = (date) => {
  let formattedDate = format(new Date(date), "yyyy-MM-dd");
  return formattedDate;
};

//get list Players API 1
app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  let sqlQuery;
  if (status != "" && priority != "") {
    if (priorityArray.includes(priority) && statusArray.includes(status)) {
      sqlQuery = `SELECT * FROM todo where status='${status}' and priority='${priority}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else if (!priorityArray.includes(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (category != "" && priority != "") {
    if (priorityArray.includes(priority) && categoryArray.includes(category)) {
      sqlQuery = `SELECT * FROM todo where category='${category}' and priority='${priority}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else if (!categoryArray.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (category != "" && status != "") {
    if (statusArray.includes(status) && categoryArray.includes(category)) {
      sqlQuery = `SELECT * FROM todo where category='${category}' and status='${status}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else if (!categoryArray.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (status != "") {
    if (statusArray.includes(status)) {
      sqlQuery = `SELECT * FROM todo where status='${status}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (priority != "") {
    if (priorityArray.includes(priority)) {
      sqlQuery = `SELECT * FROM todo where priority='${priority}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (category != "") {
    if (categoryArray.includes(category)) {
      sqlQuery = `SELECT * FROM todo where category='${category}';`;
      const listResponse = await db.all(sqlQuery);
      response.send(listResponse.map((todo) => convertTodoToJson(todo)));
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    sqlQuery = `SELECT * FROM todo where todo LIKE '%${search_q}%';`;
    const listResponse = await db.all(sqlQuery);
    response.send(listResponse.map((todo) => convertTodoToJson(todo)));
  }
});

// API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(convertTodoToJson(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date = "" } = request.query;

  if (!isMatch(date, "yyyy-MM-dd")) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const formattedDate = formatDate(date);
    const isDateValid = isValid(new Date(formattedDate));
    if (isDateValid) {
      const getDueDateTodo = `SELECT
      *
    FROM
      todo
    WHERE due_date = '${formattedDate}';`;
      const todos = await db.all(getDueDateTodo);
      response.send(todos.map((todo) => convertTodoToJson(todo)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  try {
    const formattedDate = formatDate(dueDate);
    const isDateValid = isValid(new Date(formattedDate));

    if (!statusArray.includes(status)) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (!priorityArray.includes(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (!categoryArray.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else if (isDateValid !== true) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const postTodoQuery = `
    INSERT INTO
      todo (id,todo,priority,status,category,due_date) 
    VALUES (
      ${id},'${todo}','${priority}','${status}','${category}','${formattedDate}'
    );
    `;
      await db.run(postTodoQuery);
      response.send("Todo Successfully Added");
    }
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  let formattedDate;
  switch (true) {
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.status !== undefined:
      if (!statusArray.includes(requestBody.status)) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        updateColumn = "Status";
      }
      break;
    case requestBody.priority !== undefined:
      if (!priorityArray.includes(requestBody.priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        updateColumn = "Priority";
      }
      break;
    case requestBody.category !== undefined:
      if (!categoryArray.includes(requestBody.category)) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        updateColumn = "Category";
      }
      break;
    case requestBody.dueDate !== undefined:
      try {
        formattedDate = formatDate(requestBody.dueDate);
        const isDateValid = isValid(new Date(formattedDate));
        if (isDateValid === false) {
          response.status(400);
          response.send("Invalid Due Date");
        } else {
          updateColumn = "Due Date";
        }
      } catch (e) {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
  if (updateColumn !== "") {
    const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`;
    const previousTodo = await db.get(previousTodoQuery);
    const {
      todo = previousTodo.todo,
      status = previousTodo.status,
      priority = previousTodo.priority,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;
    const updateTodoQuery = `
      UPDATE
        todo
      SET
        todo = '${todo}',
        status = '${status}',
        priority = '${priority}',
        category = '${category}',
        due_date = '${formattedDate}'
      WHERE
        id = ${todoId}
      `;
    await db.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
});
//API delete
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
