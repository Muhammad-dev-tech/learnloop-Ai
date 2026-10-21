import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.academic import Subject, Topic, LearningObjective
from app.models.user import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

CURRICULUM_SEED_DATA = [
    {
        "subject": "Computer Science & Software Engineering",
        "description": "Foundational and advanced principles of computation, algorithms, data management, and systems design.",
        "topics": [
            {
                "name": "Data Structures & Algorithms",
                "description": "Core structures including arrays, linked lists, trees, graphs, and algorithmic complexity analysis (Big-O).",
                "order_index": 1,
                "objectives": [
                    "Analyze time and space complexity using Big-O asymptotic notation.",
                    "Implement and manipulate linear structures: Linked Lists, Stacks, and Queues.",
                    "Construct binary search trees (BST), balanced AVL trees, and traversals.",
                    "Compare sorting algorithms: Quicksort, Mergesort, and Heapsort.",
                    "Apply graph algorithms: Breadth-First Search (BFS) and Depth-First Search (DFS)."
                ]
            },
            {
                "name": "Operating Systems & Concurrency",
                "description": "Process scheduling, thread synchronization, memory management, and file systems.",
                "order_index": 2,
                "objectives": [
                    "Distinguish between processes, threads, and CPU scheduling algorithms.",
                    "Analyze concurrency issues: race conditions, mutual exclusion, semaphores, and deadlocks.",
                    "Explain virtual memory, paging, page replacement algorithms, and TLB.",
                    "Understand file system organization, I/O management, and system calls."
                ]
            },
            {
                "name": "Database Management Systems",
                "description": "Relational data modeling, SQL queries, normalization, ACID transactions, and indexing.",
                "order_index": 3,
                "objectives": [
                    "Design relational schemas with Primary Keys, Foreign Keys, and constraints.",
                    "Execute complex SQL queries using JOINs, aggregations, and subqueries.",
                    "Normalize databases from 1NF up to BCNF to prevent update anomalies.",
                    "Explain transaction processing, ACID guarantees, and concurrency isolation levels."
                ]
            },
            {
                "name": "Computer Networks & Web Protocols",
                "description": "OSI and TCP/IP models, routing protocols, HTTP/HTTPS, WebSockets, and network security.",
                "order_index": 4,
                "objectives": [
                    "Compare the 7-layer OSI model and 4-layer TCP/IP architectural suite.",
                    "Explain the TCP 3-way handshake, flow control, and UDP differences.",
                    "Trace HTTP/1.1 vs. HTTP/2 vs. HTTP/3 request/response lifecycle.",
                    "Examine modern transport layer security (TLS 1.3) and symmetric/asymmetric encryption."
                ]
            },
            {
                "name": "Artificial Intelligence & Machine Learning",
                "description": "Search algorithms, supervised and unsupervised learning, neural networks, and LLMs.",
                "order_index": 5,
                "objectives": [
                    "Formulate problem spaces with state-space search: A* search and heuristics.",
                    "Differentiate supervised learning (regression, classification) and unsupervised clustering.",
                    "Explain artificial neural networks, backpropagation, and gradient descent.",
                    "Understand Transformer attention mechanisms and Large Language Model architectures."
                ]
            }
        ]
    },
    {
        "subject": "Mathematics for Computing",
        "description": "Mathematical rigor, discrete logic, linear algebra, and probability essential for modern computing.",
        "topics": [
            {
                "name": "Discrete Mathematics & Logic",
                "description": "Propositional logic, predicate calculus, set theory, combinatorics, and graph theory.",
                "order_index": 1,
                "objectives": [
                    "Evaluate propositional formulas, truth tables, and logical equivalences.",
                    "Apply proof techniques: direct proof, contrapositive, contradiction, and induction.",
                    "Solve counting problems using permutations, combinations, and the Pigeonhole Principle.",
                    "Model network connectivity and relations with graph theory definitions."
                ]
            },
            {
                "name": "Linear Algebra for Computing",
                "description": "Vectors, matrices, linear transformations, eigenvalues, and matrix factorizations.",
                "order_index": 2,
                "objectives": [
                    "Perform vector space operations, dot products, and orthogonal projections.",
                    "Compute matrix multiplication, determinants, rank, and inverse matrices.",
                    "Calculate eigenvalues and eigenvectors for linear transformations.",
                    "Interpret Principal Component Analysis (PCA) and Singular Value Decomposition (SVD)."
                ]
            },
            {
                "name": "Probability & Statistics",
                "description": "Random variables, probability distributions, hypothesis testing, and Bayes' Theorem.",
                "order_index": 3,
                "objectives": [
                    "Apply Bayes' Theorem to compute conditional probabilities in predictive systems.",
                    "Differentiate discrete (Binomial, Poisson) and continuous (Normal, Uniform) distributions.",
                    "Calculate expected value, variance, and standard deviation.",
                    "Perform statistical hypothesis testing with p-values and confidence intervals."
                ]
            }
        ]
    },
    {
        "subject": "Cybersecurity & Cloud Systems",
        "description": "Threat analysis, cryptographic primitives, cloud infrastructure, and distributed defense.",
        "topics": [
            {
                "name": "Network Security & Applied Cryptography",
                "description": "Symmetric and asymmetric encryption, public key infrastructure (PKI), and defense mechanisms.",
                "order_index": 1,
                "objectives": [
                    "Understand AES symmetric ciphers and RSA/ECC asymmetric cryptography.",
                    "Analyze digital signatures, hash functions (SHA-256), and certificate authorities.",
                    "Identify common attack vectors: Man-in-the-Middle, DDoS, and ARP spoofing."
                ]
            },
            {
                "name": "Cloud Infrastructure & Containerization",
                "description": "Virtualization, Docker containers, Kubernetes orchestration, and cloud architecture.",
                "order_index": 2,
                "objectives": [
                    "Compare bare-metal virtualization, hypervisors, and OCI containers.",
                    "Architect resilient cloud systems with auto-scaling and load balancing.",
                    "Implement Infrastructure as Code and continuous deployment pipelines."
                ]
            }
        ]
    },
    {
        "subject": "Web & Mobile Engineering",
        "description": "Client-server architecture, modern responsive user interfaces, and mobile application paradigms.",
        "topics": [
            {
                "name": "Modern Full-Stack Web Development",
                "description": "Component-driven frontend frameworks, RESTful & GraphQL APIs, and state management.",
                "order_index": 1,
                "objectives": [
                    "Master asynchronous JavaScript/TypeScript, DOM lifecycle, and reactivity.",
                    "Design secure, versioned RESTful APIs with stateless authentication.",
                    "Optimize web performance, Core Web Vitals, and caching strategies."
                ]
            },
            {
                "name": "Mobile Computing & Native Architectures",
                "description": "Mobile UI design principles, offline data synchronization, and device sensor integration.",
                "order_index": 2,
                "objectives": [
                    "Understand cross-platform vs native compilation pipelines.",
                    "Implement offline-first persistence using SQLite/IndexedDB with sync triggers.",
                    "Manage mobile battery lifecycle and background tasks."
                ]
            }
        ]
    }
]

async def seed_curriculum_if_empty(db: AsyncSession) -> None:
    """Idempotently seeds foundational subjects, topics, and default student account."""
    res = await db.execute(select(Subject).limit(1))
    existing_subject = res.scalars().first()

    if not existing_subject:
        logger.info("Database curriculum empty. Seeding academic subjects, topics, and objectives...")

        for subject_data in CURRICULUM_SEED_DATA:
            subject = Subject(
                name=subject_data["subject"],
                description=subject_data["description"]
            )
            db.add(subject)
            await db.flush()

            for topic_data in subject_data["topics"]:
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_data["name"],
                    description=topic_data["description"],
                    order_index=topic_data["order_index"]
                )
                db.add(topic)
                await db.flush()

                for obj_text in topic_data["objectives"]:
                    objective = LearningObjective(
                        topic_id=topic.id,
                        objective_text=obj_text
                    )
                    db.add(objective)

        await db.commit()
        logger.info("Successfully seeded academic curriculum!")

    # Check if a default student user exists
    user_res = await db.execute(select(User).limit(1))
    existing_user = user_res.scalars().first()
    if not existing_user:
        demo_user = User(
            email="student@learnloop.edu",
            full_name="Demo Student",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(demo_user)
        await db.commit()
        logger.info("Created default demo student account (student@learnloop.edu / password123)")
