---
name: neo4j-spring-data-skill
description: 当使用 Spring Data Neo4j（SDN 7.x/8.x）构建基于 Neo4j 的 Spring Boot 应用时使用——
  @Node 实体映射、@Relationship、@RelationshipProperties、Neo4jRepository、ReactiveNeo4jRepository、
  @Query 注解、application.yml 配置、投影、Neo4jClient、Neo4jTemplate、
  事务、审计，或 Spring AI Neo4jVectorStore 向量搜索。
  不处理脱离 Spring 的原生 Java 驱动代码——请使用 neo4j-driver-java-skill。
  不处理 Cypher 查询编写——请使用 neo4j-cypher-skill。
  不处理驱动版本升级——请使用 neo4j-migration-skill。
version: 1.0.5
allowed-tools: Bash WebFetch
---

# Neo4j Spring Data 技能

## 何时使用

- 使用 Neo4j 配置 Spring Boot（`spring-boot-starter-data-neo4j`）
- 编写 `@Node` 实体类以及 `@Relationship`/`@RelationshipProperties` 映射
- 定义 `Neo4jRepository` 或 `ReactiveNeo4jRepository` 接口
- 在仓库方法上编写带 Cypher 的 `@Query` 注解
- 在 Neo4j 中使用 Spring 投影（基于接口、DTO、动态）
- 配置 `application.yml` 以连接 Neo4j
- 通过 `Neo4jClient` 或 `Neo4jTemplate` 执行自定义查询
- 在 Spring 应用中使用 Spring AI `Neo4jVectorStore` 进行向量搜索
- 事务管理、审计、乐观锁

## 何时不使用

- **脱离 Spring 的原生 Java 驱动** → `neo4j-driver-java-skill`
- **Cypher 查询编写** → `neo4j-cypher-skill`
- **驱动版本升级** → `neo4j-migration-skill`
- **GDS 算法** → `neo4j-gds-skill`

---

## 版本矩阵

| SDN    | Spring Boot | Spring Framework | Java | Neo4j |
|--------|-------------|-----------------|------|-------|
| 8.0.x  | 3.3.x / 3.4.x | 6.2.x          | 17+  | 5.15+ |
| 8.1.x  | 3.4.x+      | 7.0.x           | 17+  | 5.15+ |
| 7.5.x  | 3.2.x       | 6.1.x           | 17+  | 4.4+  |

使用 `spring-boot-starter-data-neo4j`——它会引入 SDN + 驱动。使用 Spring Boot BOM 时无需显式指定 SDN 版本。

---

## 设置

### Maven

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-neo4j</artifactId>
</dependency>
```

### Gradle

```gradle
implementation 'org.springframework.boot:spring-boot-starter-data-neo4j'
```

### 响应式栈（在上面基础上追加）

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

---

## 配置

### application.yml — 命令式（标准）

```yaml
spring:
  neo4j:
    uri: ${NEO4J_URI:bolt://localhost:7687}
    authentication:
      username: ${NEO4J_USERNAME:neo4j}
      password: ${NEO4J_PASSWORD}
  data:
    neo4j:
      database: ${NEO4J_DATABASE:neo4j}
```

### application.yml — Aura（需要 TLS）

```yaml
spring:
  neo4j:
    uri: ${NEO4J_URI}            # neo4j+s://xxxx.databases.neo4j.io
    authentication:
      username: ${NEO4J_USERNAME:neo4j}
      password: ${NEO4J_PASSWORD}
  data:
    neo4j:
      database: ${NEO4J_DATABASE:neo4j}
```

凭证：存放在 `.env` 中；切勿硬编码。确认 `.env` 已在 `.gitignore` 中。

---

## 实体映射

```java
import org.springframework.data.neo4j.core.schema.*;

// Internal generated ID (default for most cases)
@Node("Person")
public class PersonEntity {
    @Id @GeneratedValue private Long id;         // element ID (Long)
    private String name;
    @Property("birth_year") private Integer birthYear;  // custom property name
    @Relationship(type = "KNOWS", direction = Relationship.Direction.OUTGOING)
    private List<PersonEntity> friends = new ArrayList<>();
}

// UUID business key
@Node("Product")
public class ProductEntity {
    @Id @GeneratedValue(generatorClass = GeneratedValue.UUIDStringGenerator.class)
    private String id;
    @Version private Long version;               // optimistic locking; required with business key
}

// User-assigned key (caller sets value; no @GeneratedValue)
@Node("Country")
public class CountryEntity {
    @Id private String isoCode;
    private String name;
}

// Multiple static labels
@Node(primaryLabel = "Vehicle", labels = {"Car", "Auditable"})
public class CarEntity { ... }

// Runtime labels
@Node("Content")
public class ContentEntity {
    @Id @GeneratedValue private Long id;
    @DynamicLabels private Set<String> tags = new HashSet<>();  // labels added at runtime
}
```

---

## 关系属性

当关系本身携带数据时，使用 `@RelationshipProperties`。

```java
@RelationshipProperties
public class RolesRelationship {

    @RelationshipId                     // internal relationship ID; required
    private Long id;

    private List<String> roles;

    @TargetNode                         // marks the other end of the relationship
    private PersonEntity person;
}
```

```java
@Node("Movie")
public class MovieEntity {

    @Id @GeneratedValue
    private Long id;

    private String title;

    @Relationship(type = "ACTED_IN", direction = Relationship.Direction.INCOMING)
    private List<RolesRelationship> actorsAndRoles = new ArrayList<>();
}
```

---

## 仓库接口

### 基础 CRUD

```java
import org.springframework.data.neo4j.repository.Neo4jRepository;

public interface PersonRepository extends Neo4jRepository<PersonEntity, Long> {

    Optional<PersonEntity> findByName(String name);

    List<PersonEntity> findByBirthYearBetween(int from, int to);

    List<PersonEntity> findByNameContainingIgnoreCase(String fragment);

    long countByBirthYearGreaterThan(int year);

    void deleteByName(String name);
}
```

### @Query — 自定义 Cypher

```java
// CORRECT: $param bound parameter
@Query("MATCH (p:Person {name: $name})-[:KNOWS]->(f:Person) RETURN f")
List<PersonEntity> findFriendsOf(String name);

// With pagination
@Query(value = "MATCH (p:Person) RETURN p ORDER BY p.name",
       countQuery = "MATCH (p:Person) RETURN count(p)")
Page<PersonEntity> findAllPaged(Pageable pageable);

// Return relationship-rich entity; map target via @Node return
@Query("MATCH (m:Movie)<-[r:ACTED_IN]-(p:Person {name: $name}) RETURN m, collect(r), collect(p)")
List<MovieEntity> findMoviesActedInBy(String name);
```

**安全规则**：绝不要将用户输入字符串拼接到 Cypher 中。始终使用 `$paramName`。

### 分页与排序

```java
Page<PersonEntity> findByBirthYearGreaterThan(int year, Pageable pageable);

List<PersonEntity> findTop10ByOrderByNameAsc();

List<PersonEntity> findByName(String name, Sort sort);
```

用法：

```java
Pageable page = PageRequest.of(0, 20, Sort.by("name").ascending());
Page<PersonEntity> result = repo.findByBirthYearGreaterThan(1980, page);
```

---

## 投影

### 接口投影（封闭式 — 可查询优化）

```java
public interface PersonSummary {
    String getName();
    Integer getBirthYear();
}

List<PersonSummary> findByBirthYearLessThan(int year);
```

### DTO 投影（record — Java 17+ 首选）

```java
public record PersonDto(String name, Integer birthYear) {}

List<PersonDto> findByName(String name);
```

### 动态投影

```java
<T> List<T> findByName(String name, Class<T> type);

// Usage
repo.findByName("Alice", PersonSummary.class);
repo.findByName("Alice", PersonEntity.class);
```

### 开放投影 — SpEL（禁用查询优化）

```java
public interface FullName {
    @Value("#{target.name + ' (' + target.birthYear + ')'}") String getDisplayName();
}
```

---

## 响应式仓库

```java
import org.springframework.data.neo4j.repository.ReactiveNeo4jRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ReactivePersonRepository extends ReactiveNeo4jRepository<PersonEntity, Long> {

    Mono<PersonEntity> findByName(String name);

    @Query("MATCH (p:Person {name: $name})-[:KNOWS]->(f) RETURN f")
    Flux<PersonEntity> findFriendsOf(String name);
}
```

不要在同一应用上下文中混用命令式和响应式数据库访问。

---

## 自定义仓库实现

片段（Fragment）模式——当 `@Query` 不够用时使用。

```java
// 1. Fragment interface
public interface PersonRepositoryCustom {
    List<PersonEntity> findByComplexCriteria(String criteria);
}

// 2. Impl — must end with "Impl"
public class PersonRepositoryCustomImpl implements PersonRepositoryCustom {
    private final Neo4jClient neo4jClient;
    PersonRepositoryCustomImpl(Neo4jClient c) { this.neo4jClient = c; }

    @Override
    public List<PersonEntity> findByComplexCriteria(String c) {
        return new ArrayList<>(neo4jClient
            .query("MATCH (p:Person) WHERE p.name CONTAINS $c RETURN p").bind(c).to("c")
            .fetchAs(PersonEntity.class)
            .mappedBy((t, r) -> { var e = new PersonEntity(); e.setName(r.get("p").asNode().get("name").asString()); return e; })
            .all());
    }
}

// 3. Compose
public interface PersonRepository extends Neo4jRepository<PersonEntity, Long>, PersonRepositoryCustom {}
```

---

## Neo4jClient — 低层查询

当 `@Query` 不足，或需要完全控制 Cypher 执行时使用。

```java
// Bind params + fetch single scalar
neo4jClient.query("MATCH (p:Person {name: $name}) RETURN count(*) AS cnt")
    .bind("Alice").to("name")
    .fetchAs(Long.class)
    .mappedBy((t, r) -> r.get("cnt").asLong())
    .one();

// Bind + run write (no result)
neo4jClient.query("MERGE (p:Person {name: $name})")
    .bind(personName).to("name")
    .run();

// Custom object mapping
neo4jClient.query("MATCH (p:Person)-[:DIRECTED]->(m:Movie) WHERE p.name=$n RETURN p, collect(m) AS movies")
    .bind("Lilly Wachowski").to("n")
    .fetchAs(Director.class)
    .mappedBy((typeSystem, record) -> new Director(
        record.get("p").asNode().get("name").asString(),
        record.get("movies").asList(v -> new Movie(v.get("title").asString()))
    )).one();
```

完整 API：[references/neo4j-client.md](references/neo4j-client.md)

---

## 事务管理

```java
@Service
@Transactional                      // class-level: all methods transactional
public class PersonService {
    @Transactional(readOnly = true) // read-only hint
    public Optional<PersonEntity> findByName(String name) { ... }

    @Transactional                  // explicit write
    public PersonEntity save(PersonEntity p) { return repository.save(p); }
}
```

`Neo4jTransactionManager` 会自动配置。在没有显式限定符的情况下，不要与 JPA 的 `PlatformTransactionManager` 混用。在具体类上使用 `@Transactional`，不要用在接口上。

---

## Spring AI — Neo4jVectorStore

### 依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-vector-store-neo4j</artifactId>
</dependency>
```

### application.yml

```yaml
spring:
  ai:
    vectorstore:
      neo4j:
        initialize-schema: true         # creates vector index on first run
        index-name: my-index
        embedding-dimension: 1536       # must match your embedding model
        distance-type: cosine           # cosine (default) or euclidean
        label: Document                 # node label for stored chunks
        embedding-property: embedding   # property for the vector
```

需要 Neo4j 5.15+。复用 `spring.neo4j.*` 连接配置。

### 用法

```java
@Autowired VectorStore vectorStore;

// Store
vectorStore.add(List.of(new Document("text", Map.of("author", "alice"))));

// Similarity search
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.builder().query("spring neo4j").topK(5).similarityThreshold(0.75).build()
);

// With metadata filter
vectorStore.similaritySearch(
    SearchRequest.builder().query("spring neo4j").topK(5)
        .filterExpression("author == 'alice'").build()
);
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `MappingException: Could not find entity` | 实体未被扫描 | 检查 `@EnableNeo4jRepositories` 的基础包 |
| 加载后关系为 null | 默认深度可能跳过深层关系 | 使用带 `RETURN m, collect(r), collect(p)` 的 `@Query` |
| N+1 查询 | 按实体逐个获取关系 | 用单个 `@Query` 重写；使用投影 |
| `OptimisticLockingFailureException` | 并发写入时 `@Version` 陈旧 | 在服务层重试 |
| `IllegalStateException: Cannot mix reactive/imperative` | 同一上下文中存在两种仓库类型 | 选择一种栈 |
| 投影字段为 null | getter 名称不匹配 | 让 getter 与属性名匹配；检查 `@Property` 别名 |
| 含关系时 `@Query` 为空 | 缺少 `collect(r), collect(p)` | 一并返回根节点 + 关系 + 相关节点 |
| `Cannot delete node, node has relationships` | `deleteById` 未 detach | 使用带 `DETACH DELETE` 的 `@Query` |
| 事务未回滚 | `@Transactional` 用在接口上 | 应用在具体的服务类上 |

---

## 关系加载 — 关键规则

SDN 会在配置的深度内（默认：1 跳）急切加载相关实体。对于更深的图：

```java
// Explicit @Query to control what gets loaded
@Query("""
    MATCH (m:Movie)<-[r:ACTED_IN]-(p:Person)
    WHERE m.title = $title
    RETURN m, collect(r), collect(p)
    """)
Optional<MovieEntity> findByTitleWithCast(String title);
```

RETURN 中的 `collect(r), collect(p)` 是 SDN 正确映射 `@RelationshipProperties` 所必需的。

---

## 参考资料

- [Spring Data Neo4j Reference (8.x)](https://docs.spring.io/spring-data/neo4j/reference/)
- [Spring AI Neo4jVectorStore](https://docs.spring.io/spring-ai/reference/api/vectordbs/neo4j.html)
- [GraphAcademy: Building Neo4j Apps with Spring Data](https://graphacademy.neo4j.com/courses/app-spring-data/)
- [Neo4j Getting Started — SDN](https://neo4j.com/docs/getting-started/languages-guides/java/spring-data-neo4j/)
- [SDN Advanced projections](https://docs.spring.io/spring-data/neo4j/reference/repositories/projections.html)
- [SDN Auditing](https://docs.spring.io/spring-data/neo4j/reference/object-mapping/auditing.html)
- [Modeling pitfalls, projection guide, type mapping](references/modeling-pitfalls.md)

---

## 检查清单

- [ ] `@Node` 使用显式的标签字符串，而非默认类名
- [ ] `@Id @GeneratedValue`（或用于业务键乐观锁的 `@Id` + `@Version`）
- [ ] `@RelationshipProperties` 类含 `@RelationshipId` 和 `@TargetNode`
- [ ] `@Relationship` 方向显式指定（OUTGOING / INCOMING）
- [ ] `@Query` Cypher 使用 `$paramName` — 不做字符串拼接
- [ ] 关系丰富的 `@Query` 在根节点旁返回 `collect(r), collect(p)`
- [ ] 在 `application.yml` 中设置了数据库名（避免默认数据库歧义）
- [ ] 数据库中存在用于仓库查找的任意业务键的唯一约束
- [ ] `@Transactional` 用在具体的服务类上（不是接口）
- [ ] 同一应用上下文中没有命令式 + 响应式的混用
- [ ] 凭证放在环境变量中；`.env` 在 `.gitignore` 中
- [ ] 首次运行时设置 `spring.ai.vectorstore.neo4j.initialize-schema: true`（Spring AI）
