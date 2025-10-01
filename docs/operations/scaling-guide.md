# Infrastructure Scaling Guide

## Docker Swarm Deployment
1. Initialize swarm: `docker swarm init`
2. Deploy stack: `docker stack deploy -c docker-compose.swarm.yml lokifi`
3. Scale services: `docker service scale fynix_backend=5`
4. Monitor: `docker service ls`

## Manual Scaling
1. Scale backend: `docker-compose up -d --scale backend=3`
2. Scale frontend: `docker-compose up -d --scale frontend=2`
3. Update load balancer configuration accordingly

## Load Testing
1. Install: `pip install locust`
2. Run: `locust -f backend/load_test.py --host=http://localhost`
3. Monitor performance during load tests
4. Scale based on CPU/memory usage and response times

## Monitoring Scaling
- Watch CPU usage: Should stay below 70%
- Monitor memory: Should stay below 80%
- Response times: Should stay below 500ms
- Error rates: Should stay below 1%

## Auto-scaling Triggers
- Scale up when CPU > 70% for 5 minutes
- Scale down when CPU < 30% for 10 minutes
- Maximum 10 backend instances
- Minimum 2 backend instances
